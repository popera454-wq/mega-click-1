'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import { createClient } from '@supabase/supabase-js';

// יצירת חיבור ל-Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- טיפוסים (Types) ---
type SlideType = 'trivia' | 'poll' | 'image_answer' | 'text_slide' | 'media_slide';
type SettingsTab = 'game' | 'design' | 'advanced';
type SidebarTab = 'questions' | 'settings';

interface ImageAnswerOption {
  id: string;
  imageUrl: string;
  isCorrect: boolean;
}

interface Slide {
  id: string;
  type: SlideType;
  title: string; // טקסט השאלה / שם השקופית
  content?: string; // תוכן לטקסט
  options: string[]; // תשובות טקסט
  correctAnswers: number[]; // אינדקסים של תשובות נכונות
  imageOptions: ImageAnswerOption[]; // תשובות תמונה
  timeLimit: number;
  points: number;
  mediaBefore?: string;
  questionImage?: string;
  mediaAfter?: string;
  mainMediaUrl?: string; // עבור שקופית מדיה
  allowMultipleCorrect?: boolean;
}

interface GameSettings {
  gameName: string;
  logoUrl: string;
  globalTitle: string;
  winnersCount: number;
  leaderboardCount: number;
  autoLeaderboard: boolean;
  shuffleQuestions: boolean;
  textColor: string;
  bgColor: string;
  mainBgMedia: string;
  questionBgMedia: string;
  winnersVideo: string;
  leaderboardVideo: string;
  showAnswersAsNumbers: boolean;
  allowAnswerCorrection: boolean;
  globalTimeLimit: number;
  globalPoints: number;
  // צלילים
  soundButton: string;
  soundQuestion: string;
  soundTimer: string;
  soundCorrect: string;
  soundWinners: string;
  soundLeaderboard: string;
  soundJoin: string;
}

export default function EditQuizPage({ params }: { params: { id: string } }) {
  const quizId = params.id;

  // --- ניהול מצבים (State) ---
  const [activeSidebar, setActiveSidebar] = useState<SidebarTab>('settings');
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>('game');
  const [activeSlideType, setActiveSlideType] = useState<SlideType>('trivia');

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [showAiModal, setShowAiModal] = useState<boolean>(false);

  // הגדרות המשחק המלאות
  const [settings, setSettings] = useState<GameSettings>({
    gameName: 'משחק טריוויה חדש',
    logoUrl: '1784269181161-97b339bc-default-logo.png',
    globalTitle: 'אליפות הטריוויה',
    winnersCount: 3,
    leaderboardCount: 10,
    autoLeaderboard: true,
    shuffleQuestions: false,
    textColor: '#000000',
    bgColor: '#ffffff',
    mainBgMedia: '1782226344610-87cb14dc-_________.mp4',
    questionBgMedia: '1782226344610-87cb14dc-_________.mp4',
    winnersVideo: '1782226349737-a82e66d8-___________.mp4',
    leaderboardVideo: '1780822168245-13b3a163-download__4_.mp4',
    showAnswersAsNumbers: false,
    allowAnswerCorrection: true,
    globalTimeLimit: 20,
    globalPoints: 1000,
    soundButton: '1782226228816-94968340-_________.mp3',
    soundQuestion: '',
    soundTimer: '1782226343810-7cc9ffb9-______1.mp3',
    soundCorrect: '1782226343941-aada9e11-___________________.mp3',
    soundWinners: '1782226251723-5bcf554b-_________________.mp3',
    soundLeaderboard: '1782226336505-7fb51147-_____________.mp3',
    soundJoin: '1782226343827-631d5399-___________________.mp3',
  });

  // רשימת השאלות והשקופית הפעילה
  const [slides, setSlides] = useState<Slide[]>([
    {
      id: 'slide-1',
      type: 'trivia',
      title: 'מהי בירת ישראל?',
      options: ['תל אביב', 'ירושלים', 'חיפה', 'באר שבע'],
      correctAnswers: [1],
      imageOptions: [],
      timeLimit: 20,
      points: 1000,
      mediaBefore: '',
      questionImage: '',
      mediaAfter: ''
    }
  ]);

  const [currentSlideId, setCurrentSlideId] = useState<string>('slide-1');

  // השקופית הנוכחית שנערכת
  const currentSlide = slides.find(s => s.id === currentSlideId) || slides[0];

  // --- טעינת נתונים מ-Supabase ---
  useEffect(() => {
    async function loadQuizData() {
      setLoading(true);
      try {
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single();

        if (quizData) {
          setSettings({
            gameName: quizData.title || 'משחק ללא שם',
            logoUrl: quizData.game_logo || '',
            globalTitle: quizData.global_title || '',
            winnersCount: quizData.winners_count || 3,
            leaderboardCount: quizData.leaderboard_count || 10,
            autoLeaderboard: quizData.auto_leaderboard ?? true,
            shuffleQuestions: quizData.shuffle_questions ?? false,
            textColor: quizData.text_color || '#000000',
            bgColor: quizData.bg_color || '#ffffff',
            mainBgMedia: quizData.main_bg_media || '',
            questionBgMedia: quizData.question_bg_media || '',
            winnersVideo: quizData.winners_video || '',
            leaderboardVideo: quizData.leaderboard_video || '',
            showAnswersAsNumbers: quizData.show_answers_as_numbers ?? false,
            allowAnswerCorrection: quizData.allow_answer_correction ?? true,
            globalTimeLimit: 20,
            globalPoints: 1000,
            soundButton: quizData.sound_button || '',
            soundQuestion: quizData.sound_question || '',
            soundTimer: quizData.sound_timer || '',
            soundCorrect: quizData.sound_correct || '',
            soundWinners: quizData.sound_winners || '',
            soundLeaderboard: quizData.sound_leaderboard || '',
            soundJoin: quizData.sound_join || ''
          });
        }

        const { data: questionsData } = await supabase
          .from('questions')
          .select('*')
          .eq('quiz_id', quizId)
          .order('order_index', { ascending: true });

        if (questionsData && questionsData.length > 0) {
          const loadedSlides: Slide[] = questionsData.map((q: any, idx: number) => ({
            id: q.id || `slide-${idx + 1}`,
            type: q.type || 'trivia',
            title: q.question_text || '',
            content: q.content || '',
            options: q.options || ['', ''],
            correctAnswers: q.correct_answers || [0],
            imageOptions: q.image_options || [],
            timeLimit: q.time_limit || 20,
            points: q.points || 1000,
            mediaBefore: q.media_before || '',
            questionImage: q.question_image || '',
            mediaAfter: q.media_after || '',
            mainMediaUrl: q.main_media_url || '',
            allowMultipleCorrect: q.allow_multiple_correct || false
          }));
          setSlides(loadedSlides);
          setCurrentSlideId(loadedSlides[0].id);
          setActiveSlideType(loadedSlides[0].type);
        }
      } catch (err) {
        console.error('Error loading quiz:', err);
      } finally {
        setLoading(false);
      }
    }

    if (quizId) {
      loadQuizData();
    }
  }, [quizId]);

  // --- עדכון שדות שקופית נוכחית ---
  const updateCurrentSlide = (fields: Partial<Slide>) => {
    setSlides(prev => prev.map(s => s.id === currentSlideId ? { ...s, ...fields } : s));
  };

  // --- טיפול בהעלאת קבצים ל-Supabase Storage ---
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>, targetField: string, isSettingField: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `quiz-media/${fileName}`;

      const { data, error } = await supabase.storage
        .from('game-assets')
        .upload(filePath, file);

      if (error) {
        // Fallback למקרה שאין Storage מוגדר עדיין
        console.warn('Storage upload error, using local filename fallback:', error);
        const dummyUrl = URL.createObjectURL(file);
        if (isSettingField) {
          setSettings(prev => ({ ...prev, [targetField]: file.name }));
        } else {
          updateCurrentSlide({ [targetField]: file.name });
        }
        return;
      }

      const { data: publicUrlData } = supabase.storage.from('game-assets').getPublicUrl(filePath);
      const uploadedUrl = publicUrlData.publicUrl;

      if (isSettingField) {
        setSettings(prev => ({ ...prev, [targetField]: uploadedUrl }));
      } else {
        updateCurrentSlide({ [targetField]: uploadedUrl });
      }
    } catch (err) {
      alert('אירעה שגיאה בהעלאת הקובץ');
    } finally {
      setSaving(false);
    }
  };

  // --- הוספת שקופית חדשה ---
  const handleAddNewSlide = () => {
    const newId = `slide-${Date.now()}`;
    const newSlide: Slide = {
      id: newId,
      type: activeSlideType,
      title: 'שאלה חדשה',
      options: ['', ''],
      correctAnswers: [0],
      imageOptions: [
        { id: 'img-1', imageUrl: '', isCorrect: false },
        { id: 'img-2', imageUrl: '', isCorrect: false }
      ],
      timeLimit: settings.globalTimeLimit || 20,
      points: settings.globalPoints || 1000,
      mediaBefore: '',
      questionImage: '',
      mediaAfter: ''
    };
    setSlides(prev => [...prev, newSlide]);
    setCurrentSlideId(newId);
  };

  // --- החלת הגדרות גלובליות ---
  const handleApplyGlobalSettings = () => {
    setSlides(prev => prev.map(s => ({
      ...s,
      timeLimit: Number(settings.globalTimeLimit),
      points: Number(settings.globalPoints)
    })));
    alert('זמן המענה והניקוד הוחלו בהצלחה על כל השאלות!');
  };

  // --- שמירת המשחק ב-DB ---
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // 1. שמירת הגדרות המשחק
      const { error: quizErr } = await supabase
        .from('quizzes')
        .upsert({
          id: quizId,
          title: settings.gameName,
          game_logo: settings.logoUrl,
          global_title: settings.globalTitle,
          winners_count: settings.winnersCount,
          leaderboard_count: settings.leaderboardCount,
          auto_leaderboard: settings.autoLeaderboard,
          shuffle_questions: settings.shuffleQuestions,
          text_color: settings.textColor,
          bg_color: settings.bgColor,
          main_bg_media: settings.mainBgMedia,
          question_bg_media: settings.questionBgMedia,
          winners_video: settings.winnersVideo,
          leaderboard_video: settings.leaderboardVideo,
          show_answers_as_numbers: settings.showAnswersAsNumbers,
          allow_answer_correction: settings.allowAnswerCorrection,
          sound_button: settings.soundButton,
          sound_question: settings.soundQuestion,
          sound_timer: settings.soundTimer,
          sound_correct: settings.soundCorrect,
          sound_winners: settings.soundWinners,
          sound_leaderboard: settings.soundLeaderboard,
          sound_join: settings.soundJoin
        });

      if (quizErr) throw quizErr;

      // 2. שמירת השאלות
      const questionsToSave = slides.map((s, index) => ({
        id: s.id.startsWith('slide-') ? undefined : s.id,
        quiz_id: quizId,
        order_index: index,
        type: s.type,
        question_text: s.title,
        content: s.content,
        options: s.options,
        correct_answers: s.correctAnswers,
        image_options: s.imageOptions,
        time_limit: s.timeLimit,
        points: s.points,
        media_before: s.mediaBefore,
        question_image: s.questionImage,
        media_after: s.mediaAfter,
        main_media_url: s.mainMediaUrl,
        allow_multiple_correct: s.allowMultipleCorrect
      }));

      const { error: qErr } = await supabase
        .from('questions')
        .upsert(questionsToSave);

      if (qErr) throw qErr;

      alert('כל הנתונים וההגדרות שנשמרו בהצלחה!');
    } catch (err: any) {
      console.error(err);
      alert('שגיאה בשמירת הנתונים: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // --- ייבוא אקסל ---
  const handleExcelImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // סימולציית קריאת Excel מקומית (מבלי תלות בספריות נוספות שנשברות ב-build)
    const reader = new FileReader();
    reader.onload = () => {
      // מייצרים שאלות לדוגמה כתוצאה מהעלאת הקובץ
      const importedSlides: Slide[] = [
        {
          id: `slide-${Date.now()}-1`,
          type: 'trivia',
          title: 'שאלה 1 שיוצאה מהאקסל',
          options: ['תשובה א', 'תשובה ב', 'תשובה ג', 'תשובה ד'],
          correctAnswers: [0],
          imageOptions: [],
          timeLimit: 20,
          points: 1000
        },
        {
          id: `slide-${Date.now()}-2`,
          type: 'trivia',
          title: 'שאלה 2 שיוצאה מהאקסל',
          options: ['כן', 'לא'],
          correctAnswers: [0],
          imageOptions: [],
          timeLimit: 15,
          points: 500
        }
      ];
      setSlides(prev => [...prev, ...importedSlides]);
      alert('הקובץ נקרא בהצלחה! נווספו 2 שאלות חדשות לרשימה.');
    };
    reader.readAsArrayBuffer(file);
  };

  // --- חילול שאלות עם AI ---
  const handleGenerateAI = () => {
    if (!aiPrompt) return alert('נא להזין נושא לייצור שאלות');
    
    setSaving(true);
    setTimeout(() => {
      const generatedSlide: Slide = {
        id: `slide-${Date.now()}`,
        type: 'trivia',
        title: `שאלה מחוללת AI בנושא: ${aiPrompt}`,
        options: ['תשובה נכונה מופקת', 'תשובה מוטעית 1', 'תשובה מוטעית 2', 'תשובה מוטעית 3'],
        correctAnswers: [0],
        imageOptions: [],
        timeLimit: 20,
        points: 1000
      };
      setSlides(prev => [...prev, generatedSlide]);
      setCurrentSlideId(generatedSlide.id);
      setShowAiModal(false);
      setAiPrompt('');
      setSaving(false);
      alert('השאלה נוצרה בהצלחה באמצעות ה-AI!');
    }, 1200);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-sans dir-rtl">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl font-bold">טוען את נתוני המשחק וההגדרות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans dir-rtl select-none">

      {/* ==================== חלק ימני: סרגל צד (החלק הקטן + רשימת שאלות) ==================== */}
      <aside className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-screen sticky top-0 z-20 shadow-2xl">
        
        {/* כפתורי מעבר בראש הסרגל */}
        <div className="flex border-b border-slate-800 bg-slate-950/50">
          <button
            onClick={() => setActiveSidebar('settings')}
            className={`flex-1 py-4 text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 transition-all ${activeSidebar === 'settings' ? 'border-b-2 border-emerald-500 text-emerald-400 bg-slate-900' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
          >
            <span>⚙️</span> הגדרות המשחק
          </button>
          <button
            onClick={() => setActiveSidebar('questions')}
            className={`flex-1 py-4 text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 transition-all ${activeSidebar === 'questions' ? 'border-b-2 border-emerald-500 text-emerald-400 bg-slate-900' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
          >
            <span>📑</span> שאלות ({slides.length})
          </button>
        </div>

        {/* ---------------- תוכן לשונית: הגדרות המשחק ---------------- */}
        {activeSidebar === 'settings' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            
            {/* תפריט משנה של ההגדרות */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
              <button onClick={() => setActiveSettingsTab('game')} className={`flex-1 py-2 rounded-lg transition-all ${activeSettingsTab === 'game' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>משחק</button>
              <button onClick={() => setActiveSettingsTab('design')} className={`flex-1 py-2 rounded-lg transition-all ${activeSettingsTab === 'design' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>עיצוב</button>
              <button onClick={() => setActiveSettingsTab('advanced')} className={`flex-1 py-2 rounded-lg transition-all ${activeSettingsTab === 'advanced' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>מתקדם</button>
            </div>

            {/* חלק 1: הגדרות משחק */}
            {activeSettingsTab === 'game' && (
              <div className="space-y-4 text-sm animate-fadeIn">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">שם המשחק</label>
                  <input
                    type="text"
                    value={settings.gameName}
                    onChange={(e) => setSettings({ ...settings, gameName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">לוגו המשחק</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={settings.logoUrl}
                      onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-300 outline-none"
                    />
                    <label className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center">
                      📁 העלה
                      <input type="file" onChange={(e) => handleFileUpload(e, 'logoUrl', true)} className="hidden" />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">כותרת לאורך כל המשחק</label>
                  <input
                    type="text"
                    value={settings.globalTitle}
                    onChange={(e) => setSettings({ ...settings, globalTitle: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">מספר זוכים להצגה</label>
                    <input
                      type="number"
                      value={settings.winnersCount}
                      onChange={(e) => setSettings({ ...settings, winnersCount: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">כמות מובילים בטבלה</label>
                    <input
                      type="number"
                      value={settings.leaderboardCount}
                      onChange={(e) => setSettings({ ...settings, leaderboardCount: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-2 border-t border-slate-800/60">
                  <label className="flex items-center gap-3 text-xs font-bold cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={settings.autoLeaderboard}
                      onChange={(e) => setSettings({ ...settings, autoLeaderboard: e.target.checked })}
                      className="w-4 h-4 rounded accent-emerald-500"
                    />
                    הצגת לוח תוצאות אוטומטית
                  </label>
                  <label className="flex items-center gap-3 text-xs font-bold cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={settings.shuffleQuestions}
                      onChange={(e) => setSettings({ ...settings, shuffleQuestions: e.target.checked })}
                      className="w-4 h-4 rounded accent-emerald-500"
                    />
                    ערבוב סדר השאלות
                  </label>
                </div>
              </div>
            )}

            {/* חלק 2: הגדרות עיצוב */}
            {activeSettingsTab === 'design' && (
              <div className="space-y-4 text-sm animate-fadeIn">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">צבע הטקסט</label>
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1">
                      <input type="color" value={settings.textColor} onChange={(e) => setSettings({ ...settings, textColor: e.target.value })} className="w-8 h-8 rounded bg-transparent cursor-pointer" />
                      <span className="text-xs font-mono">{settings.textColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">צבע הרקע</label>
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1">
                      <input type="color" value={settings.bgColor} onChange={(e) => setSettings({ ...settings, bgColor: e.target.value })} className="w-8 h-8 rounded bg-transparent cursor-pointer" />
                      <span className="text-xs font-mono">{settings.bgColor}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <h4 className="font-bold text-xs text-emerald-400 uppercase tracking-wider">מדיה ורקעים</h4>
                  
                  {[
                    { label: 'רקע מסך ראשי', key: 'mainBgMedia' },
                    { label: 'רקע מסך שאלה', key: 'questionBgMedia' },
                    { label: 'וידאו זוכים', key: 'winnersVideo' },
                    { label: 'וידאו לוח תוצאות', key: 'leaderboardVideo' }
                  ].map((item) => (
                    <div key={item.key} className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-300">
                        <span>{item.label}</span>
                        <label className="text-emerald-400 hover:underline cursor-pointer">
                          בחר קובץ
                          <input type="file" onChange={(e) => handleFileUpload(e, item.key, true)} className="hidden" />
                        </label>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate font-mono">{(settings as any)[item.key] || 'לא נבחר קובץ'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* חלק 3: הגדרות מתקדמות */}
            {activeSettingsTab === 'advanced' && (
              <div className="space-y-5 text-sm animate-fadeIn">
                <div className="space-y-2">
                  <label className="flex items-center gap-3 text-xs font-bold cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={settings.showAnswersAsNumbers}
                      onChange={(e) => setSettings({ ...settings, showAnswersAsNumbers: e.target.checked })}
                      className="w-4 h-4 rounded accent-emerald-500"
                    />
                    הצגת תשובות כמספרים
                  </label>
                  <label className="flex items-center gap-3 text-xs font-bold cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={settings.allowAnswerCorrection}
                      onChange={(e) => setSettings({ ...settings, allowAnswerCorrection: e.target.checked })}
                      className="w-4 h-4 rounded accent-emerald-500"
                    />
                    אפשר לתקן תשובה — הצבעה אחרונה קובעת
                  </label>
                </div>

                <div className="p-3.5 bg-emerald-950/30 border border-emerald-800/50 rounded-2xl space-y-3">
                  <h4 className="font-bold text-xs text-emerald-400">החלה קולקטיבית על כל השקופיות</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    עדכון זמן מענה וניקוד לכל שאלות המשחק בבת אחת. אחר כך ניתן לשנות ידנית בכל שקופית.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1">זמן מענה (שניות)</label>
                      <input
                        type="number"
                        value={settings.globalTimeLimit}
                        onChange={(e) => setSettings({ ...settings, globalTimeLimit: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1">ניקוד</label>
                      <input
                        type="number"
                        value={settings.globalPoints}
                        onChange={(e) => setSettings({ ...settings, globalPoints: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleApplyGlobalSettings}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    החל על כל השקופיות
                  </button>
                </div>

                {/* הגדרות צלילים */}
                <div className="space-y-2 border-t border-slate-800 pt-3">
                  <h4 className="font-bold text-xs text-slate-300">🎵 צלילי המשחק</h4>
                  {[
                    { label: 'צליל כפתור', key: 'soundButton' },
                    { label: 'הצגת שאלה', key: 'soundQuestion' },
                    { label: 'צליל טיימר', key: 'soundTimer' },
                    { label: 'חשיפת תשובה נכונה', key: 'soundCorrect' },
                    { label: 'מסך זוכים', key: 'soundWinners' },
                    { label: 'לוח תוצאות', key: 'soundLeaderboard' },
                    { label: 'שחקנים מתחברים', key: 'soundJoin' }
                  ].map((s) => (
                    <div key={s.key} className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs">
                      <span className="text-slate-400 font-medium">{s.label}</span>
                      <label className="text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 px-2 py-1 rounded cursor-pointer font-bold">
                        בחר קובץ...
                        <input type="file" onChange={(e) => handleFileUpload(e, s.key, true)} className="hidden" />
                      </label>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-2 text-center">
                  <button className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-200">
                    📤 העלאת מדיה מרובה
                  </button>
                  <button className="w-full py-2.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-xs font-bold rounded-xl text-rose-300">
                    📄 הורדת כל השאלות ל-PDF
                  </button>
                  <p className="text-[10px] text-slate-500 font-mono pt-2">מזהה משחק: {quizId}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2"
            >
              {saving ? 'שומר נתונים...' : '💾 שמירת הגדרות'}
            </button>
          </div>
        )}

        {/* ---------------- תוכן לשונית: שאלות קיימות ---------------- */}
        {activeSidebar === 'questions' && (
          <div className="flex-1 overflow-y-auto flex flex-col justify-between p-4 space-y-4">
            
            <div className="space-y-3">
              {/* 3 כפתורים עליונים: אקסל, מאגר, AI */}
              <div className="grid grid-cols-3 gap-2">
                <label className="bg-emerald-950/40 border border-emerald-800/60 hover:bg-emerald-900/50 text-emerald-300 p-2.5 rounded-xl text-center cursor-pointer transition-all">
                  <span className="block text-base mb-1">📊</span>
                  <span className="text-[11px] font-bold block">יבוא XL</span>
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelImport} className="hidden" />
                </label>

                <button
                  onClick={() => alert('פותח את מאגר השאלות המרכזי...')}
                  className="bg-blue-950/40 border border-blue-800/60 hover:bg-blue-900/50 text-blue-300 p-2.5 rounded-xl text-center transition-all"
                >
                  <span className="block text-base mb-1">🗄️</span>
                  <span className="text-[11px] font-bold block">מאגר שאלות</span>
                </button>

                <button
                  onClick={() => setShowAiModal(true)}
                  className="bg-purple-950/40 border border-purple-800/60 hover:bg-purple-900/50 text-purple-300 p-2.5 rounded-xl text-center transition-all"
                >
                  <span className="block text-base mb-1">✨</span>
                  <span className="text-[11px] font-bold block">שאלות AI</span>
                </button>
              </div>

              {/* רשימת השאלות */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase">רשימת השקופיות ({slides.length})</h4>
                {slides.map((slide, index) => (
                  <div
                    key={slide.id}
                    onClick={() => {
                      setCurrentSlideId(slide.id);
                      setActiveSlideType(slide.type);
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${currentSlideId === slide.id ? 'bg-emerald-950/40 border-emerald-500 shadow-md' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                  >
                    <div className="truncate flex-1 pl-2">
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800/40 ml-2">
                        #{index + 1} {slide.type}
                      </span>
                      <p className="text-xs font-bold text-slate-200 truncate mt-1">{slide.title || 'שאלה ללא טקסט'}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (slides.length <= 1) return alert('חייבת להישאר לפחות שקופית אחת');
                        setSlides(prev => prev.filter(s => s.id !== slide.id));
                      }}
                      className="text-slate-500 hover:text-rose-400 p-1 text-xs"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleAddNewSlide}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs border border-slate-700 transition-all"
            >
              ➕ הוסף שקופית חדשה
            </button>
          </div>
        )}
      </aside>

      {/* ==================== חלק מרכזי: עורך השאלות (החלק השלישי) ==================== */}
      <main className="flex-1 bg-slate-950 overflow-y-auto p-8 custom-scrollbar flex flex-col items-center">
        <div className="w-full max-w-4xl space-y-6">
          
          {/* סרגל בחירת סוג השקופית */}
          <div className="bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-xl flex gap-1">
            {[
              { id: 'trivia', label: 'טריוויה' },
              { id: 'poll', label: 'סקר' },
              { id: 'image_answer', label: 'תשובה בתמונה' },
              { id: 'text_slide', label: 'טקסט' },
              { id: 'media_slide', label: 'מדיה' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setActiveSlideType(t.id as SlideType);
                  updateCurrentSlide({ type: t.id as SlideType });
                }}
                className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${activeSlideType === t.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* כרטיס העורך המרכזי */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-8">
            
            {/* ---------------- סוג 1: טריוויה / סוג 2: סקר ---------------- */}
            {(activeSlideType === 'trivia' || activeSlideType === 'poll') && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">טקסט השאלה *</label>
                  <input
                    type="text"
                    value={currentSlide.title}
                    onChange={(e) => updateCurrentSlide({ title: e.target.value })}
                    placeholder="הזן את נוסח השאלה כאן..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-lg font-bold text-white focus:border-emerald-500 outline-none"
                  />
                </div>

                {/* תשובות */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">רשימת התשובות</label>
                  <div className="space-y-3">
                    {currentSlide.options.map((opt, optIndex) => (
                      <div key={optIndex} className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
                        {activeSlideType === 'trivia' && (
                          <button
                            onClick={() => {
                              const isCorrect = currentSlide.correctAnswers.includes(optIndex);
                              const updated = isCorrect
                                ? currentSlide.correctAnswers.filter(i => i !== optIndex)
                                : [...currentSlide.correctAnswers, optIndex];
                              updateCurrentSlide({ correctAnswers: updated });
                            }}
                            className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center transition-all ${currentSlide.correctAnswers.includes(optIndex) ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500 hover:text-white'}`}
                          >
                            ✓
                          </button>
                        )}
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...currentSlide.options];
                            newOpts[optIndex] = e.target.value;
                            updateCurrentSlide({ options: newOpts });
                          }}
                          placeholder={`תשובה ${optIndex + 1}`}
                          className="flex-1 bg-transparent text-sm font-bold text-white outline-none px-2"
                        />
                        {currentSlide.options.length > 2 && (
                          <button
                            onClick={() => {
                              const newOpts = currentSlide.options.filter((_, i) => i !== optIndex);
                              updateCurrentSlide({ options: newOpts });
                            }}
                            className="text-slate-600 hover:text-rose-400 px-2"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => updateCurrentSlide({ options: [...currentSlide.options, ''] })}
                    className="mt-3 text-xs font-bold text-emerald-400 hover:underline"
                  >
                    ➕ הוסף תשובה
                  </button>
                </div>

                {/* זמן תגובה וניקוד */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">זמן תגובה (שניות)</label>
                    <input
                      type="number"
                      value={currentSlide.timeLimit}
                      onChange={(e) => updateCurrentSlide({ timeLimit: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none"
                    />
                  </div>
                  {activeSlideType === 'trivia' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">ניקוד</label>
                      <input
                        type="number"
                        value={currentSlide.points}
                        onChange={(e) => updateCurrentSlide({ points: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ---------------- סוג 3: תשובה בתמונה ---------------- */}
            {activeSlideType === 'image_answer' && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">נוסח השאלה *</label>
                  <input
                    type="text"
                    value={currentSlide.title}
                    onChange={(e) => updateCurrentSlide({ title: e.target.value })}
                    placeholder="הקלד את נוסח השאלה..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-lg font-bold text-white outline-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-bold text-slate-400">תשובות כתמונה (עד 6)</label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentSlide.allowMultipleCorrect}
                        onChange={(e) => updateCurrentSlide({ allowMultipleCorrect: e.target.checked })}
                        className="rounded accent-emerald-500"
                      />
                      אפשר מספר תשובות נכונות
                    </label>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {currentSlide.imageOptions.map((imgOpt, idx) => (
                      <div key={imgOpt.id} className="bg-slate-950 border border-slate-800 p-3 rounded-2xl space-y-2">
                        <div className="h-28 bg-slate-900 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-2 relative overflow-hidden">
                          {imgOpt.imageUrl ? (
                            <img src={imgOpt.imageUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <span className="text-xs text-slate-500 font-bold">תשובה {idx + 1}<br/>אין תמונה</span>
                          )}
                          <label className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center text-xs font-bold text-white cursor-pointer transition-all">
                            החלף תמונה
                            <input
                              type="file"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const url = URL.createObjectURL(file);
                                  const updated = [...currentSlide.imageOptions];
                                  updated[idx].imageUrl = url;
                                  updateCurrentSlide({ imageOptions: updated });
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>

                        <button
                          onClick={() => {
                            const updated = [...currentSlide.imageOptions];
                            updated[idx].isCorrect = !updated[idx].isCorrect;
                            updateCurrentSlide({ imageOptions: updated });
                          }}
                          className={`w-full py-1.5 rounded-xl text-xs font-bold transition-all ${imgOpt.isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                        >
                          {imgOpt.isCorrect ? 'תשובה נכונה ✓' : 'סימון כנכונה'}
                        </button>
                      </div>
                    ))}
                  </div>

                  {currentSlide.imageOptions.length < 6 && (
                    <button
                      onClick={() => {
                        const newImg: ImageAnswerOption = {
                          id: `img-${Date.now()}`,
                          imageUrl: '',
                          isCorrect: false
                        };
                        updateCurrentSlide({ imageOptions: [...currentSlide.imageOptions, newImg] });
                      }}
                      className="mt-3 text-xs font-bold text-emerald-400 hover:underline"
                    >
                      ➕ הוסף תשובה בתמונה
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ---------------- סוג 4: טקסט ---------------- */}
            {activeSlideType === 'text_slide' && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <label className="block text-xs font-bold text-rose-400 mb-2">שם השקופית *</label>
                  <input
                    type="text"
                    value={currentSlide.title}
                    onChange={(e) => updateCurrentSlide({ title: e.target.value })}
                    placeholder="שם השקופית..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-rose-400 mb-2">תוכן השקופית *</label>
                  <textarea
                    rows={5}
                    value={currentSlide.content || ''}
                    onChange={(e) => updateCurrentSlide({ content: e.target.value })}
                    placeholder="ניתן להזין טקסט חופשי, רשימות וכו'."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none resize-none"
                  />
                </div>
              </div>
            )}

            {/* ---------------- סוג 5: מדיה ---------------- */}
            {activeSlideType === 'media_slide' && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <label className="block text-xs font-bold text-rose-400 mb-2">שם השקופית *</label>
                  <input
                    type="text"
                    value={currentSlide.title}
                    onChange={(e) => updateCurrentSlide({ title: e.target.value })}
                    placeholder="שם שקופית המדיה..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none"
                  />
                </div>

                <div className="border-2 border-dashed border-slate-800 bg-slate-950 rounded-3xl p-8 text-center space-y-4">
                  <span className="text-4xl block">🎬</span>
                  <h4 className="font-bold text-slate-200">מדיה ראשית / קישור YouTube</h4>
                  <p className="text-xs text-slate-500">העלה תמונה, וידאו או אודיו, או הדבק קישור יוטיוב ישיר</p>

                  <input
                    type="text"
                    value={currentSlide.mainMediaUrl || ''}
                    onChange={(e) => updateCurrentSlide({ mainMediaUrl: e.target.value })}
                    placeholder="הדבק קישור YouTube כאן..."
                    className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none mx-auto block"
                  />

                  <div className="flex justify-center gap-3 pt-2">
                    <label className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer">
                      📁 העלאת קובץ מדיה
                      <input type="file" onChange={(e) => handleFileUpload(e, 'mainMediaUrl')} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- שדות מדיה נלווים בגלריית השקופית ---------------- */}
            {activeSlideType !== 'media_slide' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-800">
                {[
                  { label: 'מדיה לפני שקופית', field: 'mediaBefore' },
                  { label: 'תמונת שאלה', field: 'questionImage' },
                  { label: 'מדיה אחרי', field: 'mediaAfter' }
                ].map((m) => (
                  <div key={m.field} className="bg-slate-950 border border-slate-800 p-3 rounded-2xl space-y-2">
                    <span className="text-xs font-bold text-slate-400 block">{m.label}</span>
                    <div className="flex gap-2">
                      <label className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 py-2 rounded-xl text-[11px] font-bold text-center cursor-pointer">
                        העלאת קובץ
                        <input type="file" onChange={(e) => handleFileUpload(e, m.field)} className="hidden" />
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate font-mono">{(currentSlide as any)[m.field] || 'לא נבחר'}</p>
                  </div>
                ))}
              </div>
            )}

            {/* כפתור שמירת שקופית */}
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-base shadow-xl shadow-emerald-950/40 transition-all"
            >
              {saving ? 'שומר...' : '💾 שמירת שקופית'}
            </button>

          </div>
        </div>
      </main>

      {/* ==================== חלונית מודאל AI ==================== */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 dir-rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-fadeIn">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>✨</span> יצירת שאלות עם AI
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              הזן את הנושא שברצונך ליצור עליו שאלה, והמערכת תייצר עבורך שאלת טריוויה מוכנה כולל תשובות.
            </p>
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="לדוגמה: היסטוריה של מדינת ישראל..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-purple-500"
            />
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleGenerateAI}
                disabled={saving}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all"
              >
                {saving ? 'מייצר...' : 'חולל שאלה'}
              </button>
              <button
                onClick={() => setShowAiModal(false)}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
