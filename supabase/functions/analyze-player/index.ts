import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    console.log('Analyzing player:', userId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch player data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    // Fetch transactions
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('trans_time', { ascending: false })
      .limit(100);

    if (transError) throw transError;

    // Fetch behavior data
    const { data: behavior, error: behaviorError } = await supabase
      .from('player_behavior')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (behaviorError) throw behaviorError;

    // Calculate statistics
    const totalBets = transactions?.filter(t => t.trans_type === 'bet').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const totalWins = transactions?.filter(t => t.trans_type === 'win').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const totalDeposits = transactions?.filter(t => t.trans_type === 'deposit').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const totalWithdrawals = transactions?.filter(t => t.trans_type === 'withdrawal').reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    const avgBetSize = transactions?.filter(t => t.trans_type === 'bet').length || 0;
    const winRate = totalBets > 0 ? (totalWins / totalBets) * 100 : 0;
    const netProfit = totalWins - totalBets;

    // Prepare data for AI analysis
    const analysisData = {
      profile: {
        username: profile.username,
        balance: profile.balance,
        depositLimit: profile.deposit_limit,
        playTimeLimit: profile.play_time_limit,
        lastLogin: profile.last_login,
        isBanned: profile.is_banned,
      },
      statistics: {
        totalBets,
        totalWins,
        totalDeposits,
        totalWithdrawals,
        avgBetSize: avgBetSize > 0 ? totalBets / avgBetSize : 0,
        winRate,
        netProfit,
        transactionCount: transactions?.length || 0,
      },
      behavior: behavior || [],
      recentTransactions: transactions?.slice(0, 20) || [],
    };

    // Generate AI analysis
    let aiAnalysis = null;
    if (lovableApiKey) {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
              content: `You are an expert betting behavior analyst. Analyze player data and provide:
1. Risk assessment (Low/Medium/High)
2. Behavioral patterns (positive, concerning, or suspicious)
3. Recommendations (Ban, Monitor Closely, Safe to Continue, or Encourage Responsible Gaming)
4. Key insights about their betting behavior
5. Specific red flags if any

Focus on: win rates, bet patterns, deposit frequency, withdrawal patterns, and overall financial behavior.
Be concise and actionable.`
            },
            {
              role: 'user',
              content: `Analyze this player data:\n\n${JSON.stringify(analysisData, null, 2)}`
            }
          ],
        }),
      });

      const aiData = await response.json();
      aiAnalysis = aiData.choices?.[0]?.message?.content;
      console.log('AI Analysis generated');
    }

    // Calculate risk score
    let riskScore = 0;
    
    // High win rate might indicate cheating
    if (winRate > 70) riskScore += 30;
    else if (winRate > 55) riskScore += 15;
    
    // Rapid deposits could indicate problem gambling
    const recentDeposits = transactions?.filter(t => 
      t.trans_type === 'deposit' && 
      new Date(t.trans_time) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length || 0;
    if (recentDeposits > 5) riskScore += 25;
    else if (recentDeposits > 3) riskScore += 15;
    
    // Suspicious bet patterns
    const behaviorRisk = behavior?.reduce((sum, b) => sum + (b.risk_score || 0), 0) || 0;
    riskScore += Math.min(behaviorRisk / 10, 30);
    
    // Balance anomalies
    if (profile.balance < 0) riskScore += 20;
    if (profile.balance > totalDeposits * 5) riskScore += 25;

    riskScore = Math.min(100, Math.round(riskScore));

    let recommendation = 'Safe to Continue';
    if (riskScore > 70) recommendation = 'Ban Recommended';
    else if (riskScore > 50) recommendation = 'Monitor Closely';
    else if (riskScore > 30) recommendation = 'Encourage Responsible Gaming';

    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          player: analysisData,
          riskScore,
          recommendation,
          aiInsights: aiAnalysis,
          flags: {
            highWinRate: winRate > 70,
            rapidDeposits: recentDeposits > 5,
            negativeBalance: profile.balance < 0,
            suspiciousBehavior: behaviorRisk > 50,
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-player:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An error occurred' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
