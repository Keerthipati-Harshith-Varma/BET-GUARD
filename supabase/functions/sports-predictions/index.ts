import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sport, teams } = await req.json();
    console.log('Generating predictions for:', sport, teams);

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Generate AI predictions
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
            content: `You are a sports betting analyst. Generate realistic match predictions with odds.
            
Response format (JSON):
{
  "match": "Team A vs Team B",
  "sport": "sport name",
  "predictions": [
    { "outcome": "Team A Win", "odds": 1.85, "probability": 54, "confidence": "medium" },
    { "outcome": "Draw", "odds": 3.40, "probability": 29, "confidence": "low" },
    { "outcome": "Team B Win", "odds": 4.20, "probability": 17, "confidence": "low" }
  ],
  "analysis": "Brief analysis of the match",
  "keyFactors": ["factor 1", "factor 2", "factor 3"]
}`
          },
          {
            role: 'user',
            content: `Generate betting odds and predictions for a ${sport} match between ${teams.team1} and ${teams.team2}. Include win probabilities and confidence levels.`
          }
        ],
      }),
    });

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    // Parse AI response
    let predictions;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      predictions = JSON.parse(jsonMatch ? jsonMatch[1] : content);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      // Fallback to default predictions
      predictions = {
        match: `${teams.team1} vs ${teams.team2}`,
        sport,
        predictions: [
          { outcome: `${teams.team1} Win`, odds: 2.10, probability: 48, confidence: "medium" },
          { outcome: "Draw", odds: 3.20, probability: 31, confidence: "low" },
          { outcome: `${teams.team2} Win`, odds: 3.50, probability: 21, confidence: "low" }
        ],
        analysis: "This match could go either way based on current form.",
        keyFactors: ["Recent performance", "Head-to-head record", "Home advantage"]
      };
    }

    return new Response(
      JSON.stringify({ success: true, predictions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sports-predictions:', error);
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
