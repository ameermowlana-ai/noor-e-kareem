import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    safety_alert: {
      type: Type.OBJECT,
      properties: {
        triggered: { type: Type.BOOLEAN },
        message_ta: { type: Type.STRING, nullable: true }
      },
      required: ["triggered"]
    },
    salawat_focus: { type: Type.STRING },
    tier1_scientific: { type: Type.STRING },
    tier2_quran_sunnah: { type: Type.STRING },
    tier3_practical: { type: Type.STRING },
    tier4_deep_spiritual: { type: Type.STRING, nullable: true },
    campaign_reminder: { type: Type.STRING },
    audio_read_text: { type: Type.STRING, description: "Voice Read-Aloud-க்கு ஏற்ற தூய்மையான தமிழ் உரை." }
  },
  required: ["safety_alert", "salawat_focus", "tier2_quran_sunnah", "tier3_practical", "campaign_reminder", "audio_read_text"]
};

export async function POST(req: Request) {
  try {
    const { query, situation, tier4_requested, salawat_count_to_add } = await req.json();

    if (salawat_count_to_add && salawat_count_to_add > 0) {
      await supabase.from('salawat_counter').insert([
        { count_added: salawat_count_to_add, user_name: situation || 'Worker/Member' }
      ]);
    }

    const { data: globalData } = await supabase.from('global_salawat_total').select('total_count').single();
    const currentGlobalTotal = globalData ? globalData.total_count : 0;

    const distressKeywords = ["தற்கொலை", "உயிரை விடு", "மன அழுத்தம் அதிகம்", "suicide", "hopeless"];
    const isDistressed = distressKeywords.some(keyword => query.toLowerCase().includes(keyword));

    if (isDistressed) {
      const emergencyResponse = JSON.stringify({
        safety_alert: {
          triggered: true,
          message_ta: "உங்களுக்கு மன உளைச்சல் அதிகமாக இருந்தால், தயவுசெய்து உடனடியாக இலங்கையின் இலவச அவசர உதவி எண்களைத் தொடர்புகொள்ளவும்: தேசிய மனநல உதவி எண்: 1926 அல்லது CCCline: 1333. அல்லாஹ் உங்களைப் பாதுகாப்பானாக."
        },
        salawat_focus: "மன அமைதிக்கான ஸலவாத் மற்றும் திக்ர்",
        tier2_quran_sunnah: "அலா ப்திக்ரில்லாஹி தத்மைஇன்முல் குலூப் (நிச்சயமாக அல்லாஹ்வின் நினைவைக் கொண்டுதான் உள்ளங்கள் அமைதி பெறுகின்றன - அல்குர்ஆன் 13:28).",
        tier3_practical: "ஆழ்ந்த சுவாசப் பயிற்சி செய்து, ரசூலுல்லாஹ் (ஸல்) அவர்கள் மீது ஸலவாத் சொல்லுங்கள்.",
        campaign_reminder: "100 கோடி ஸலவாத் இயக்கத்துடன் இணைந்து அமைதியைப் பெறுங்கள்.",
        audio_read_text: "உங்களுக்கு மன உளைச்சல் அதிகமாக இருந்தால் உடனடியாக 1926 அல்லது 1333 எண்களைத் தொடர்புகொள்ளவும்."
      });
      return new Response(emergencyResponse, { headers: { 'Content-Type': 'application/json' } });
    }

    const { data: kbData } = await supabase
      .from('noor_knowledge_base')
      .select('content_ta, source_citation, tier_level')
      .lte('tier_level', tier4_requested ? 4 : 3)
      .limit(3);

    const ragContext = kbData ? kbData.map(k => `[${k.source_citation}]: ${k.content_ta}`).join("\n") : "";

    const systemInstruction = `You are 'Noor-e-Kareem', an official AI spiritual guide and Salawat movement assistant based on Quran, authentic Hadiths, and teachings of Sahaba, Imams, and Awliya. Global Salawat Target Progress: ${currentGlobalTotal} / 1,000,000,000. Cultivate love for Prophet Muhammad (ﷺ).`;

    const prompt = `பயனர் சூழல்: ${situation || 'பொதுவானது'}
கேள்வி: ${query}
RAG தரவு ஆதாரம்: ${ragContext}`;

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.3
      }
    });

    const encoder = new TextEncoder();
    const customReadable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            const chunkText = chunk.text;
            if (chunkText) {
              controller.enqueue(encoder.encode(chunkText));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });

    return new Response(customReadable, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error("Noor-e-Kareem API Error:", error);
    return NextResponse.json({ 
      error: true, 
      message_ta: "தொழில்நுட்பத் தடை காரணமாக பதிவைத் தருவதில் சிறு தாமதம். தயவுசெய்து மீண்டுமொருமுறை முயற்சிக்கவும்." 
    }, { status: 500 });
  }
             }
