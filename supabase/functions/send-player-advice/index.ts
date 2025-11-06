import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, adminMessage } = await req.json();

    if (!userId || !adminMessage) {
      return new Response(JSON.stringify({ error: 'Missing userId or adminMessage' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Generating AI advice for player:', userId);

    // Get player data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      throw profileError;
    }

    // Get player transactions
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('trans_time', { ascending: false })
      .limit(100);

    if (transError) {
      console.error('Transactions error:', transError);
      throw transError;
    }

    const totalBets = transactions?.filter(t => t.trans_type === 'bet')
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const totalWins = transactions?.filter(t => t.trans_type === 'win')
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const totalDeposits = transactions?.filter(t => t.trans_type === 'deposit')
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    // Generate AI advice
    const aiPrompt = `You are a responsible gaming advisor for a betting platform called BetGuard.

Player Statistics:
- Username: ${profile.username}
- Current Balance: ₹${profile.balance}
- Total Bets: ₹${totalBets.toFixed(2)}
- Total Wins: ₹${totalWins.toFixed(2)}
- Total Deposits: ₹${totalDeposits.toFixed(2)}
- Win Rate: ${totalBets > 0 ? ((totalWins / totalBets) * 100).toFixed(2) : 0}%
- Deposit Limit: ₹${profile.deposit_limit}
- Play Time Limit: ${profile.play_time_limit}h/day

Admin's Message/Concern:
${adminMessage}

Based on the admin's message and the player's statistics, provide:
1. A personalized, empathetic response addressing the admin's concern
2. Specific recommendations for the player about responsible gaming
3. Actionable advice on how to improve their betting behavior
4. Any warnings if patterns suggest problem gambling

Keep the advice constructive, supportive, and focused on player wellbeing. Be specific and reference their actual statistics.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a professional responsible gaming advisor. Provide clear, empathetic, and actionable advice.'
          },
          {
            role: 'user',
            content: aiPrompt
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const advice = aiData.choices[0].message.content;

    // Log the advice in audit log
    await supabase.from('audit_log').insert({
      user_id: userId,
      action: `admin_advice_sent: ${adminMessage.substring(0, 50)}...`
    });

    console.log('AI advice generated successfully');

    return new Response(JSON.stringify({ 
      success: true,
      advice,
      playerData: {
        username: profile.username,
        totalBets,
        totalWins,
        winRate: totalBets > 0 ? ((totalWins / totalBets) * 100).toFixed(2) : 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in send-player-advice function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
