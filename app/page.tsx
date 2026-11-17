'use client';
import { useState, useRef, useEffect } from 'react';

export default function NoorKareemApp() {
  const [query, setQuery] = useState('');
  const [situation, setSituation] = useState('Workers');
  const [tier4, setTier4] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rawJsonOutput, setRawJsonOutput] = useState('');
  const [result, setResult] = useState<any>(null);
  
  const [salawatInput, setSalawatInput] = useState<number>(100);
  const [successMsg, setSuccessMsg] = useState('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const dailyStories = [
    { id: 1, title: 'இன்றைய ஸலவாத் சிந்தனை', type: 'video', url: 'https://www.youtube.com/embed/qFf3dwlW-aY', time: '2 மணி நேரத்திற்கு முன்பு' },
    { id: 2, title: 'மன அமைதிக்கான திக்ர்', type: 'text', content: 'அல்லாஹ்வை நினைப்பதாலேயே உள்ளங்கள் அமைதி பெறுகின்றன.', time: '5 மணி நேரத்திற்கு முன்பு' },
    { id: 3, title: 'வலிமார்களின் பொன்மொழி', type: 'text', content: 'அவசரப்படாதீர்; அல்லாஹ்வின் ஏற்பாட்டின் மீது நம்பிக்கை வையுங்கள்.', time: '12 மணி நேரத்திற்கு முன்பு' }
  ];

  useEffect(() => {
    if (!rawJsonOutput) return;
    try {
      const parsed = JSON.parse(rawJsonOutput);
      setResult(parsed);
    } catch (e) {
      // Streaming in progress
    }
  }, [rawJsonOutput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setRawJsonOutput('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/noor-guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, situation, tier4_requested: tier4, salawat_count_to_add: 0 })
      });

      if (!res.body) throw new Error('ReadableStream not supported');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;
        setRawJsonOutput(accumulatedText);
      }

      setResult(JSON.parse(accumulatedText));
    } catch (err) {
      alert('பிழை ஏற்பட்டது. இணைய இணைப்பைச் சரிபார்க்கவும்.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSalawat = async () => {
    if (salawatInput <= 0) return;
    try {
      await fetch('/api/noor-guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'Salawat count submission', situation, salawat_count_to_add: salawatInput })
      });
      setSuccessMsg(`அல்ஹம்துலில்லாஹ்! தாங்கள் ஓதிய ${salawatInput} ஸலவாட்டுகள் வெற்றிகரமாக இயக்கத்தில் பதிவு செய்யப்பட்டன.`);
      setSalawatInput(100);
    } catch (err) {
      alert('பதிவு செய்வதில் சிக்கல்.');
    }
  };

  const handleReadAloud = (text: string) => {
    if (!('speechSynthesis' in window)) {
      alert('உங்கள் உலாவி குரல் வாசிப்பை ஆதரிக்கவில்லை.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ta-IN';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const generatePoster = () => {
    const canvas = canvasRef.current;
    if (!canvas || !result) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1200;
    canvas.height = 630;

    ctx.fillStyle = '#051c14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 12;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Noor-e-Kareem Foundation - ஸலவாத் ஆன்மீக வழிகாட்டி', canvas.width / 2, 110);

    ctx.fillStyle = '#f5f0e1';
    ctx.font = '32px sans-serif';
    ctx.fillText(result.salawat_focus || '', canvas.width / 2, 220, 1100);

    ctx.fillStyle = '#d4af37';
    ctx.font = '28px sans-serif';
    ctx.fillText((result.tier2_quran_sunnah || '').substring(0, 100) + '...', canvas.width / 2, 350, 1100);

    ctx.fillStyle = '#f5f0e1';
    ctx.font = 'italic 24px sans-serif';
    ctx.fillText('100 கோடி ஸலவாத் இயக்கம் • அன்பு, மரியாதை, ஈமான்', canvas.width / 2, 530);

    const imageURL = canvas.toDataURL('image/jpeg', 0.85);
    const link = document.createElement('a');
    link.download = 'Noor-e-Kareem-Foundation-Poster.jpg';
    link.href = imageURL;
    link.click();
  };

  return (
    <main className="min-h-screen bg-[#051c14] text-[#f5f0e1] p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Foundation Header */}
        <div className="bg-[#0a2e21] border border-[#d4af37]/50 rounded-2xl p-6 text-center shadow-xl">
          <div className="inline-block p-3 bg-[#d4af37]/10 rounded-full border border-[#d4af37] mb-3">
            <span className="text-2xl text-[#d4af37]">✨</span>
          </div>
          <h1 className="text-3xl font-bold text-[#d4af37] tracking-wide">NOOR-E-KAREEM FOUNDATION</h1>
          <p className="text-sm text-[#f5f0e1]/80 mt-1">அன்பு • மரியாதை • ஈமான் • 100 கோடி ஸலவாத் இயக்கம்</p>
        </div>

        {/* 24-Hour Stories / Video Feed */}
        <div className="bg-[#0a2e21] border border-[#d4af37]/30 rounded-2xl p-4 shadow-lg">
          <h2 className="text-sm font-semibold text-[#d4af37] mb-3 flex items-center justify-between">
            <span>📹 இன்றைய நேரலை & 24 மணி நேர ஸ்டேட்டஸ் பதிவுகள்</span>
            <span className="text-xs text-emerald-400">● Live Updates</span>
          </h2>
          <div className="flex space-x-4 overflow-x-auto pb-2">
            {dailyStories.map((story) => (
              <div key={story.id} className="min-w-[220px] bg-[#051c14] border border-[#d4af37]/40 rounded-xl p-3 flex-shrink-0">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-[#d4af37] font-bold">{story.title}</span>
                  <span className="text-[10px] text-gray-400">{story.time}</span>
                </div>
                {story.type === 'video' ? (
                  <div className="aspect-video bg-black rounded-lg overflow-hidden mb-2">
                    <iframe 
                      src={story.url} 
                      title="Salawat Video" 
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    />
                  </div>
                ) : (
                  <p className="text-xs text-[#f5f0e1]/90 h-16 overflow-hidden mb-2">{story.content}</p>
                )}
                <span className="text-[10px] text-[#d4af37] italic">24 மணி நேரத்தில் மறையும்</span>
              </div>
            ))}
          </div>
        </div>

        {/* Salawat Counter Contribution Box */}
        <div className="p-4 bg-[#0a2e21] border border-[#d4af37]/40 rounded-2xl shadow-lg">
          <h2 className="text-[#d4af37] font-bold text-sm mb-2">📿 100 கோடி ஸலவாத் இயக்கம் - உங்கள் பங்களிப்பைப் பதிவு செய்யுங்கள்:</h2>
          <div className="flex gap-2">
            <input 
              type="number" 
              value={salawatInput}
              onChange={(e) => setSalawatInput(Number(e.target.value))}
              className="w-32 p-2 rounded bg-[#051c14] border border-[#d4af37]/50 text-center font-bold text-[#d4af37]"
            />
            <button 
              onClick={handleAddSalawat}
              className="flex-1 py-2 bg-[#d4af37] text-[#051c14] font-bold rounded hover:bg-[#e5c76b] text-sm"
            >
              ஸலவாத் எண்ணிக்கೆಯನ್ನುச் சேர்க்கவும்
            </button>
          </div>
          {successMsg && <p className="text-xs text-emerald-400 mt-2 text-center">{successMsg}</p>}
        </div>

        {/* Main Guidance & Query Interface */}
        <div className="bg-[#0a2e21] border border-[#d4af37]/40 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-xl font-bold text-[#d4af37] mb-4 text-center">ஆன்மீக & மார்க்க வழிகாட்டல் மையம்</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#d4af37] mb-1">உங்கள் வாழ்க்கைச் சூழ்நிலை:</label>
              <select 
                value={situation} 
                onChange={(e) => setSituation(e.target.value)}
                className="w-full p-3 rounded-lg bg-[#051c14] border border-[#d4af37]/50 text-[#f5f0e1] focus:outline-none"
              >
                <option value="Workers">வேலைக்குச் செல்பவர்கள் (Workers)</option>
                <option value="Students">மாணவர்கள் (Students)</option>
                <option value="Families">குடும்பப் பொறுப்புள்ளவர்கள் (Families)</option>
                <option value="Anxious">அதிக மனக்கவலை உள்ளவர்கள் (Anxious)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#d4af37] mb-1">உங்கள் கேள்வி அல்லது கவலை:</label>
              <textarea 
                rows={3}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="உதாரணம்: மன அமைதி பெறவும் ஸலவாத்தை எவ்வாறு தொடர்வது?"
                required
                className="w-full p-3 rounded-lg bg-[#051c14] border border-[#d4af37]/50 text-[#f5f0e1] focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="tier4" 
                checked={tier4} 
                onChange={(e) => setTier4(e.target.checked)}
                className="w-4 h-4 accent-[#d4af37]"
              />
              <label htmlFor="tier4" className="text-sm text-[#f5f0e1]/90">ஆழமான தப்ஸீர் மற்றும் வலிமார்களின் (ஷாதுலியா) வழிகாட்டலைத் திறக்கவும் (Tier 4)</label>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-[#d4af37] text-[#051c14] font-bold rounded-lg hover:bg-[#e5c76b] transition-all shadow-lg"
            >
              {loading ? 'AI நிகழ்நேரமாக (Streaming) வழிகாட்டுகிறது...' : 'வழிகாட்டலைப் பெறுங்கள்'}
            </button>
          </form>

          {result && (
            <div className="mt-8 space-y-6 border-t border-[#d4af37]/30 pt-6">
              {result.safety_alert?.triggered && (
                <div className="bg-red-950/80 border border-red-500 p-4 rounded-xl text-red-200">
                  <p className="font-bold">⚠️ அவசர உதவி அறிவிப்பு:</p>
                  <p>{result.safety_alert.message_ta}</p>
                </div>
              )}

              <div className="flex justify-end">
                <button 
                  onClick={() => handleReadAloud(result.audio_read_text)}
                  className="flex items-center space-x-2 px-4 py-2 bg-[#d4af37]/20 border border-[#d4af37] text-[#d4af37] rounded-lg text-sm font-semibold"
                >
                  🔊 <span>குரல் மூலமாகக் கேட்க (Read Aloud)</span>
                </button>
              </div>

              <div className="bg-[#051c14] p-4 rounded-xl border border-[#d4af37]/20">
                <h3 className="text-[#d4af37] font-bold mb-1">🔬 அடுக்கு 1: நரம்பியல் & அறிவியல் உளவியல்</h3>
                <p className="text-sm text-[#f5f0e1]/90 leading-relaxed">{result.tier1_scientific}</p>
              </div>

              <div className="bg-[#051c14] p-4 rounded-xl border border-[#d4af37]/20">
                <h3 className="text-[#d4af37] font-bold mb-1">📖 அடுக்கு 2: அல்குர்ஆன் மற்றும் ஹதீஸ் ஆதாரம்</h3>
                <p className="text-sm text-[#f5f0e1]/90 leading-relaxed whitespace-pre-line">{result.tier2_quran_sunnah}</p>
              </div>

              <div className="bg-[#051c14] p-4 rounded-xl border border-[#d4af37]/20">
                <h3 className="text-[#d4af37] font-bold mb-1">🗓️ அடுக்கு 3: நடைமுறை ஸலவாத் அட்டவணை & ஈமான்</h3>
                <p className="text-sm text-[#f5f0e1]/90 leading-relaxed">{result.tier3_practical}</p>
              </div>

              {result.tier4_deep_spiritual && (
                <div className="bg-[#051c14] p-4 rounded-xl border border-[#d4af37]/40">
                  <h3 className="text-[#d4af37] font-bold mb-1">✨ அடுக்கு 4: தப்ஸீர் & வலிமார்களின் (ஷாதுலியா) ஞானம்</h3>
                  <p className="text-sm text-[#f5f0e1]/90 leading-relaxed">{result.tier4_deep_spiritual}</p>
                </div>
              )}

              <div className="bg-[#d4af37]/10 p-4 rounded-xl border border-[#d4af37]/50 text-center">
                <p className="text-[#d4af37] font-semibold mb-2">{result.campaign_reminder}</p>
                <p className="text-xs text-[#f5f0e1]/70">உங்களை ஒரு முழுமையான அல்லாஹ்வுடைய இறை அடியாராக மாற்றுவதற்கான வழிகாட்டல்கள் இதில் உள்ளன.</p>
              </div>

              <button 
                onClick={generatePoster}
                className="w-full py-3 bg-[#0a2e21] border border-[#d4af37] text-[#d4af37] font-bold rounded-lg hover:bg-[#d4af37] hover:text-[#051c14] transition-all shadow-md"
              >
                📥 வாட்ஸ்அப் பகிர்வுக்கான சுவரொட்டியை (Poster) பதிவிறக்க
              </button>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    </main>
  );
     }
