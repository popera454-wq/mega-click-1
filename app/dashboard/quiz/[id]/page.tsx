'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// הגדרת הסוגים החדשים
type SlideType = 'trivia' | 'poll' | 'image_answer' | 'text_slide' | 'media_slide';

interface Slide {
  id: string;
  question_type: SlideType;
  question_text?: string;
  slide_title?: string;
  slide_content?: string;
  options?: string[];
  option_images?: string[];
  correct_option?: number | null;
  correct_options?: number[];
  allow_multiple?: boolean;
  time_limit?: number;
  media_url?: string;
  youtube_url?: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
}

export default function EditQuizPage({ params }: { params: { id: string } }) {
  const quizId = params.id;
  const router = useRouter();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // --- Form States ---
  const [slideType, setSlideType] = useState<SlideType>('trivia');
  
  // States for Questions (Trivia, Poll, Image)
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [optionImages, setOptionImages] = useState<string[]>(['', '']);
  const [correctOption, setCorrectOption] = useState<number>(0);
  const [correctOptions, setCorrectOptions] = useState<number[]>([]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [timeLimit, setTimeLimit] = useState<number>(15);

  // States for Slides (Text, Media)
  const [slideTitle, setSlideTitle] = useState('');
  const [slideContent, setSlideContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');

  useEffect(() => {
    const fetchQuizData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: quizData, error: quizErr } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (quizErr || !quizData) {
        alert('החידון לא נמצא או שאין לך הרשאה אליו');
        router.push('/dashboard');
        return;
      }

      setQuiz(quizData);

      const { data: slidesData, error: slidesErr } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('created_at', { ascending: true });

      if (!slidesErr && slidesData) {
        setSlides(slidesData);
      }

      setLoading(false);
    };

    if (quizId) fetchQuizData();
  }, [quizId, router]);

  // Handle Type Changes
  const handleTypeChange = (type: SlideType) => {
    setSlideType(type);
    // איפוס שדות רלוונטיים כשמחליפים טאב
    if (type === 'trivia' || type === 'poll' || type === 'image_answer') {
      setOptions(['', '']);
      setOptionImages(['', '']);
      setCorrectOption(0);
      setCorrectOptions([]);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleAddOption = () => {
    if (options.length < 6) { // הגבלה ל-6 תשובות כמו בתמונה
      setOptions([...options, '']);
      setOptionImages([...optionImages, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      const updatedOpts = options.filter((_, i) => i !== index);
      const updatedImgs = optionImages.filter((_, i) => i !== index);
      setOptions(updatedOpts);
      setOptionImages(updatedImgs);
      if (correctOption === index) setCorrectOption(0);
    }
  };

  const toggleMultipleCorrect = (index: number) => {
    if (correctOptions.includes(index)) {
      setCorrectOptions(correctOptions.filter(i => i !== index));
    } else {
      setCorrectOptions([...correctOptions, index]);
    }
  };

  const handleSaveSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);

    try {
      const payload: any = {
        quiz_id: quizId,
        question_type: slideType,
      };

      // בניית הפיילוד בהתאם לסוג השקופית
      if (['trivia', 'poll', 'image_answer'].includes(slideType)) {
        if (!questionText.trim()) throw new Error('נא להזין את טקסט השאלה');
        
        payload.question_text = questionText.trim();
        payload.options = options.map(o => o.trim());
        payload.time_limit = timeLimit;
        
        if (slideType === 'image_answer') {
           payload.option_images = optionImages;
        }

        if (slideType !== 'poll') {
           payload.allow_multiple = allowMultiple;
           payload.correct_option = allowMultiple ? null : correctOption;
           payload.correct_options = allowMultiple ? correctOptions : [];
        }
      } else if (slideType === 'text_slide') {
        if (!slideTitle.trim()) throw new Error('נא להזין את שם השקופית');
        payload.slide_title = slideTitle.trim();
        payload.slide_content = slideContent.trim();
      } else if (slideType === 'media_slide') {
        if (!slideTitle.trim()) throw new Error('נא להזין את שם השקופית');
        payload.slide_title = slideTitle.trim();
        payload.media_url = mediaUrl;
        payload.youtube_url = youtubeUrl;
      }

      const { data, error } = await supabase
        .from('questions')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      setSlides([...slides, data]);
      
      // Reset form (Optional - you might want to keep some settings)
      setQuestionText('');
      setSlideTitle('');
      setSlideContent('');
      setYoutubeUrl('');
      setOptions(['', '']);
      setCorrectOption(0);
      setCorrectOptions([]);
      
    } catch (err: any) {
      alert('שגיאה בשמירה: ' + err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteSlide = async (id: string) => {
    if (!confirm('האם למחוק שקופית זו?')) return;
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (!error) {
      setSlides(slides.filter(s => s.id !== id));
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0d041e] text-white flex justify-center items-center dir-rtl">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f9fa] dark:bg-[#0d041e] text-gray-800 dark:text-white dir-rtl pb-10">
      
      {/* Header - Top Navbar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#130728] px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm font-bold text-gray-500 hover:text-gray-800 dark:text-white/70 dark:hover:text-white">
            ← חזרה
          </Link>
          <span className="text-lg font-bold truncate max-w-[200px]">{quiz?.title}</span>
        </div>
        <div className="flex gap-3">
            <button className="px-4 py-2 rounded-full border border-gray-300 dark:border-white/20 text-sm font-bold">
              תצוגה מקדימה 👁️
            </button>
            <Link href={`/host/${quizId}`} className="px-6 py-2 rounded-full font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg transition-all">
              שמירת הגדרות
            </Link>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        
        {/* Right Sidebar - Slides List (כמו בתמונה) */}
        <aside className="w-80 border-l border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a0b38] overflow-y-auto flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-white/10">
            <div className="flex gap-2 mb-4">
              <button className="flex-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 py-2 rounded-xl text-sm font-bold border border-emerald-200 dark:border-emerald-500/30">
                יבוא מאקסל 📊
              </button>
              <button className="flex-1 bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 py-2 rounded-xl text-sm font-bold border border-amber-200 dark:border-amber-500/30">
                צור ב-AI ✨
              </button>
            </div>
            <h3 className="font-bold text-sm text-gray-500 dark:text-white/50">{slides.length} שקופיות</h3>
          </div>

          <div className="p-4 flex flex-col gap-3">
            {slides.map((slide, idx) => (
              <div key={slide.id} className="relative group p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:border-emerald-500 transition-colors cursor-pointer">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-200 dark:bg-white/10">
                    {idx + 1}. {
                      slide.question_type === 'trivia' ? 'טריוויה' : 
                      slide.question_type === 'poll' ? 'סקר' : 
                      slide.question_type === 'image_answer' ? 'תמונה' : 
                      slide.question_type === 'text_slide' ? 'טקסט' : 'מדיה'
                    }
                  </span>
                  <button onClick={() => handleDeleteSlide(slide.id)} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs">מחק ✕</button>
                </div>
                <p className="text-sm font-semibold truncate">
                  {slide.question_text || slide.slide_title || 'שקופית ללא שם'}
                </p>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Work Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50 dark:bg-transparent">
          <div className="max-w-4xl mx-auto">
            
            {/* Top Types Toolbar */}
            <div className="flex justify-center gap-3 mb-8">
              {[
                { id: 'trivia', label: 'טריוויה', icon: '📄' },
                { id: 'poll', label: 'סקר', icon: '⏱️' },
                { id: 'image_answer', label: 'תשובה בתמונה', icon: '🖼️' },
                { id: 'text_slide', label: 'טקסט', icon: '📝' },
                { id: 'media_slide', label: 'מדיה', icon: '🎥' }
              ].map(type => (
                <button
                  key={type.id}
                  onClick={() => handleTypeChange(type.id as SlideType)}
                  className={`flex flex-col items-center justify-center w-24 h-24 rounded-2xl border transition-all ${
                    slideType === type.id 
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-md' 
                    : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-emerald-300 dark:hover:border-white/20'
                  }`}
                >
                  <span className="text-2xl mb-2">{type.icon}</span>
                  <span className="text-xs font-bold">{type.label}</span>
                </button>
              ))}
            </div>

            {/* Editor Card */}
            <div className="bg-white dark:bg-[#1a0b38] rounded-3xl p-6 md:p-8 shadow-xl border border-gray-100 dark:border-white/10">
              <form onSubmit={handleSaveSlide}>
                
                {/* 1. TRIVIA / POLL / IMAGE ANSWER */}
                {['trivia', 'poll', 'image_answer'].includes(slideType) && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold mb-2">טקסט השאלה</label>
                      <input
                        type="text"
                        required
                        value={questionText}
                        onChange={e => setQuestionText(e.target.value)}
                        placeholder={slideType === 'poll' ? "סקר: " : "שאלה חדשה"}
                        className="w-full text-xl font-bold px-4 py-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-emerald-500 outline-none"
                      />
                    </div>

                    {slideType !== 'poll' && (
                      <div className="flex items-center justify-end gap-2">
                        <label className="text-sm font-semibold">אפשר מספר תשובות נכונות</label>
                        <input type="checkbox" checked={allowMultiple} onChange={e => setAllowMultiple(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {options.map((opt, idx) => {
                        const isCorrect = allowMultiple ? correctOptions.includes(idx) : correctOption === idx;
                        return (
                          <div key={idx} className={`relative flex flex-col p-2 rounded-2xl border-2 transition-all ${isCorrect && slideType !== 'poll' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-gray-200 dark:border-white/10'}`}>
                            <div className="flex gap-2">
                              {slideType !== 'poll' && (
                                <button type="button" onClick={() => allowMultiple ? toggleMultipleCorrect(idx) : setCorrectOption(idx)} className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-white/10 text-transparent'}`}>
                                  ✓
                                </button>
                              )}
                              <input
                                type="text"
                                value={opt}
                                onChange={e => handleOptionChange(idx, e.target.value)}
                                placeholder={`תשובה ${idx + 1}`}
                                className="w-full bg-transparent outline-none font-semibold text-sm py-1"
                                required={slideType !== 'image_answer'}
                              />
                              {options.length > 2 && (
                                <button type="button" onClick={() => handleRemoveOption(idx)} className="text-gray-400 hover:text-red-500">🗑️</button>
                              )}
                            </div>
                            
                            {/* כפתור העלאת תמונה ספציפי לסוג תמונה */}
                            {slideType === 'image_answer' && (
                              <div className="mt-3 border-t border-gray-200 dark:border-white/10 pt-2 flex justify-center">
                                <button type="button" className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 hover:text-emerald-500">
                                  <span>⬆️</span> {optionImages[idx] ? 'החלף תמונה' : 'העלה תמונה לתשובה'}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {options.length < 6 && (
                      <button type="button" onClick={handleAddOption} className="text-sm font-bold text-emerald-500 hover:text-emerald-600 flex items-center gap-2">
                        + הוסף תשובה
                      </button>
                    )}

                    <div className="pt-6 border-t border-gray-100 dark:border-white/5">
                      <label className="block text-sm font-bold mb-2">זמן תגובה (שניות)</label>
                      <input type="range" min="5" max="120" step="5" value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))} className="w-full accent-emerald-500" />
                      <div className="text-center font-bold text-emerald-600 dark:text-emerald-400 mt-2">{timeLimit} שניות</div>
                    </div>
                  </div>
                )}

                {/* 2. TEXT SLIDE */}
                {slideType === 'text_slide' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-red-500 mb-2">שם השקופית *</label>
                      <input type="text" required value={slideTitle} onChange={e => setSlideTitle(e.target.value)} placeholder="שאלה חדשה" className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-red-500 mb-2">תוכן השקופית *</label>
                      <textarea required value={slideContent} onChange={e => setSlideContent(e.target.value)} placeholder="הזן את תוכן השקופית כאן..." rows={6} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-red-200 dark:border-red-500/30 outline-none resize-none" />
                      <p className="text-xs text-gray-500 mt-2">ניתן להזין טקסט חופשי, רשימות וכו'.</p>
                    </div>
                  </div>
                )}

                {/* 3. MEDIA SLIDE */}
                {slideType === 'media_slide' && (
                  <div className="space-y-6">
                     <div>
                      <label className="block text-sm font-bold text-red-500 mb-2">שם השקופית *</label>
                      <input type="text" required value={slideTitle} onChange={e => setSlideTitle(e.target.value)} placeholder="שאלה חדשה" className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 outline-none" />
                    </div>
                    
                    <div className="border-2 border-dashed border-gray-300 dark:border-white/20 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <span className="text-3xl mb-2">⬆️</span>
                      <h4 className="font-bold text-gray-700 dark:text-white">העלאת קובץ מדיה</h4>
                      <p className="text-xs text-gray-500">תמונה, וידאו או אודיו</p>
                    </div>

                    <div className="flex items-center gap-4 my-4">
                      <div className="flex-1 h-px bg-gray-200 dark:bg-white/10"></div>
                      <span className="text-sm font-bold text-gray-400">או הטמע סרטון יוטיוב</span>
                      <div className="flex-1 h-px bg-gray-200 dark:bg-white/10"></div>
                    </div>

                    <div>
                      <input type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="YouTube URL (https://www...)" className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 outline-none text-left dir-ltr" />
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={adding}
                  className="w-full mt-8 py-4 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg transition-all disabled:opacity-50"
                >
                  {adding ? 'שומר...' : 'שמירת שקופית'}
                </button>

              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
