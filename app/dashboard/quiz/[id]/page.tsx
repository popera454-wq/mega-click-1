'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
// נניח שאתה משתמש ב-Lucide לאייקונים, אם לא - החלף בטקסט
import { Settings, List, Upload, Wand2, Database, Image as ImageIcon, Video, Music, FileDown } from 'lucide-react';

// --- Types ---
type SlideType = 'trivia' | 'poll' | 'image_answer' | 'text_slide' | 'media_slide';
type SettingsTab = 'game' | 'design' | 'advanced';
type SidebarTab = 'questions' | 'settings';

export default function EditQuizPage({ params }: { params: { id: string } }) {
  const quizId = params.id;
  
  // --- Global States ---
  const [activeSidebar, setActiveSidebar] = useState<SidebarTab>('settings');
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>('game');
  const [activeSlideType, setActiveSlideType] = useState<SlideType>('trivia');
  
  // --- Form States (Mocking the massive state object for brevity) ---
  const [quizSettings, setQuizSettings] = useState<any>({});
  const [slides, setSlides] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState<any>({
    options: ['', ''],
    option_images: ['', ''],
    time_limit: 20,
    points: 1000
  });

  // --- Handlers (Action Triggers) ---
  const handleFileUpload = (field: string) => {
    // כאן תבוא הפעלת Supabase Storage האמיתית
    alert(`פותח חלונית העלאת קובץ עבור: ${field}\n(יתחבר ל-Supabase Storage בקרוב)`);
  };

  const handleImportExcel = () => {
    alert('קורא קובץ אקסל וממיר ל-JSON באמצעות ספריית xlsx...');
  };

  const handleGenerateAI = () => {
    alert('שולח בקשה ל-API (OpenAI) לייצור שאלות...');
  };

  const applyGlobalSettings = () => {
    alert('מעדכן את כל השאלות לזמן והניקוד שהוגדרו כאן!');
  };

  // --- Sub-components (For UI Cleanliness) ---
  
  // כפתור העלאת מדיה גנרי שחוזר על עצמו
  const MediaUploadBlock = ({ label, field }: { label: string, field: string }) => (
    <div className="border border-gray-200 dark:border-white/10 rounded-xl p-4 bg-gray-50 dark:bg-white/5">
      <h4 className="text-sm font-bold mb-3">{label}</h4>
      <div className="flex gap-2 text-xs font-semibold">
        <button onClick={() => handleFileUpload(field)} className="flex-1 bg-white dark:bg-black/20 border border-gray-300 dark:border-white/20 py-2 rounded-lg flex items-center justify-center gap-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/30">
          <Upload size={14} /> העלאת קובץ
        </button>
        <button className="flex-1 bg-white dark:bg-black/20 border border-gray-300 dark:border-white/20 py-2 rounded-lg flex items-center justify-center gap-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/30">
          <ImageIcon size={14} /> גלריה
        </button>
        <button className="flex-1 bg-white dark:bg-black/20 border border-gray-300 dark:border-white/20 py-2 rounded-lg flex items-center justify-center gap-1 hover:bg-red-50 dark:hover:bg-red-900/30">
          <Video size={14} /> יוטיוב
        </button>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#f4f6f8] dark:bg-[#0d041e] text-gray-800 dark:text-white dir-rtl flex">
      
      {/* ---------------- RIGHT SIDEBAR (Settings & Questions) ---------------- */}
      <aside className="w-96 bg-white dark:bg-[#1a0b38] border-l border-gray-200 dark:border-white/10 flex flex-col h-screen sticky top-0 shadow-xl z-10">
        
        {/* Sidebar Toggle Tabs */}
        <div className="flex border-b border-gray-200 dark:border-white/10">
          <button 
            onClick={() => setActiveSidebar('settings')} 
            className={`flex-1 py-4 font-bold text-sm flex justify-center gap-2 transition-colors ${activeSidebar === 'settings' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}
          >
            <Settings size={18} /> הגדרות (החלק הקטן)
          </button>
          <button 
            onClick={() => setActiveSidebar('questions')} 
            className={`flex-1 py-4 font-bold text-sm flex justify-center gap-2 transition-colors ${activeSidebar === 'questions' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}
          >
            <List size={18} /> שאלות (החלק השני)
          </button>
        </div>

        {/* --- CONTENT: SETTINGS --- */}
        {activeSidebar === 'settings' && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
            
            {/* Settings Sub-Tabs */}
            <div className="flex bg-gray-100 dark:bg-black/20 rounded-lg p-1">
              <button onClick={() => setActiveSettingsTab('game')} className={`flex-1 py-1.5 text-xs font-bold rounded-md ${activeSettingsTab === 'game' ? 'bg-white dark:bg-[#2d1b54] shadow' : ''}`}>משחק</button>
              <button onClick={() => setActiveSettingsTab('design')} className={`flex-1 py-1.5 text-xs font-bold rounded-md ${activeSettingsTab === 'design' ? 'bg-white dark:bg-[#2d1b54] shadow' : ''}`}>עיצוב</button>
              <button onClick={() => setActiveSettingsTab('advanced')} className={`flex-1 py-1.5 text-xs font-bold rounded-md ${activeSettingsTab === 'advanced' ? 'bg-white dark:bg-[#2d1b54] shadow' : ''}`}>מתקדם</button>
            </div>

            {/* Part 1: Game Settings */}
            {activeSettingsTab === 'game' && (
              <div className="space-y-4 animate-in fade-in">
                <div>
                  <label className="text-sm font-bold block mb-1">שם המשחק</label>
                  <input type="text" className="w-full p-2 border rounded-lg bg-transparent" placeholder="שם המשחק..." />
                </div>
                <div className="p-4 border border-dashed rounded-xl text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5" onClick={() => handleFileUpload('logo')}>
                  <ImageIcon className="mx-auto mb-2 text-gray-400" />
                  <span className="text-xs font-bold">לוגו (1784269181161-97b3...)</span>
                </div>
                <div>
                  <label className="text-sm font-bold block mb-1">כותרת לאורך כל המשחק</label>
                  <input type="text" className="w-full p-2 border rounded-lg bg-transparent" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold block mb-1">מספר זוכים</label>
                    <input type="number" defaultValue={3} className="w-full p-2 border rounded-lg bg-transparent" />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">מובילים בטבלה</label>
                    <input type="number" defaultValue={10} className="w-full p-2 border rounded-lg bg-transparent" />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-emerald-500 w-4 h-4" /> הצגת לוח תוצאות אוטומטית
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                  <input type="checkbox" className="accent-emerald-500 w-4 h-4" /> ערבוב סדר השאלות
                </label>
              </div>
            )}

            {/* Part 2: Design Settings */}
            {activeSettingsTab === 'design' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-bold block mb-1">צבע הטקסט</label>
                    <input type="color" className="w-full h-10 rounded cursor-pointer" />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-bold block mb-1">צבע הרקע</label>
                    <input type="color" className="w-full h-10 rounded cursor-pointer" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold border-b pb-1">מדיה (רקעים ווידאו)</h3>
                  <button onClick={() => handleFileUpload('main_bg')} className="w-full text-right p-3 border rounded-lg text-sm bg-gray-50 dark:bg-white/5 truncate">רקע מסך ראשי <br/><span className="text-xs text-emerald-500">1782226344610.mp4 ✓</span></button>
                  <button onClick={() => handleFileUpload('question_bg')} className="w-full text-right p-3 border rounded-lg text-sm bg-gray-50 dark:bg-white/5 truncate">רקע מסך שאלה <br/><span className="text-xs text-emerald-500">1782226344610.mp4 ✓</span></button>
                  <button onClick={() => handleFileUpload('winners_video')} className="w-full text-right p-3 border rounded-lg text-sm bg-gray-50 dark:bg-white/5 truncate">וידאו זוכים</button>
                  <button onClick={() => handleFileUpload('leaderboard_video')} className="w-full text-right p-3 border rounded-lg text-sm bg-gray-50 dark:bg-white/5 truncate">וידאו לוח תוצאות</button>
                </div>
              </div>
            )}

            {/* Part 3: Advanced Settings */}
            {activeSettingsTab === 'advanced' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" className="accent-emerald-500 w-4 h-4" /> הצגת תשובות כמספרים
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" defaultChecked className="accent-emerald-500 w-4 h-4" /> אפשר לתקן תשובה (הצבעה אחרונה קובעת)
                  </label>
                </div>

                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                  <h4 className="font-bold text-sm mb-2 text-emerald-800 dark:text-emerald-300">החלה קולקטיבית על כל השקופיות</h4>
                  <div className="flex gap-2 mb-2">
                    <input type="number" placeholder="זמן (שניות)" className="w-1/2 p-2 border rounded-lg text-sm" />
                    <input type="number" placeholder="ניקוד" className="w-1/2 p-2 border rounded-lg text-sm" />
                  </div>
                  <button onClick={applyGlobalSettings} className="w-full bg-emerald-500 text-white py-2 rounded-lg text-sm font-bold">החל על כל השקופיות</button>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold border-b pb-1 flex items-center gap-2"><Music size={16}/> צלילים</h3>
                  {['צליל כפתור', 'הצגת שאלה', 'צליל טיימר', 'חשיפת תשובה נכונה', 'מסך זוכים', 'לוח תוצאות', 'שחקנים מתחברים'].map(sound => (
                    <div key={sound} className="flex justify-between items-center text-xs p-2 border rounded bg-gray-50 dark:bg-white/5">
                      <span>{sound}</span>
                      <button onClick={() => handleFileUpload(`sound_${sound}`)} className="text-emerald-600 font-bold bg-emerald-100 px-2 py-1 rounded">בחר קובץ</button>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t space-y-2">
                  <button className="w-full text-sm font-bold text-blue-600 bg-blue-50 py-2 rounded-lg border border-blue-200">העלאת מדיה מרובה</button>
                  <button className="w-full text-sm font-bold text-red-600 bg-red-50 py-2 rounded-lg border border-red-200 flex justify-center gap-2"><FileDown size={16}/> הורדת כל השאלות ל-PDF</button>
                  <p className="text-center text-xs text-gray-400 mt-4">מזהה משחק: <br/>{quizId}</p>
                </div>
              </div>
            )}

            <button className="mt-auto w-full py-4 font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg transition-all">
              שמירת הגדרות
            </button>
          </div>
        )}

        {/* --- CONTENT: QUESTIONS LIST --- */}
        {activeSidebar === 'questions' && (
          <div className="flex-1 overflow-y-auto flex flex-col">
            <div className="p-4 grid grid-cols-3 gap-2 border-b">
              <button onClick={handleImportExcel} className="flex flex-col items-center justify-center py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200"><Upload size={16} className="mb-1"/> יבוא XL</button>
              <button className="flex flex-col items-center justify-center py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-200"><Database size={16} className="mb-1"/> מאגר שאלות</button>
              <button onClick={handleGenerateAI} className="flex flex-col items-center justify-center py-2 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold border border-purple-200"><Wand2 size={16} className="mb-1"/> AI</button>
            </div>
            <div className="p-4 space-y-2">
              {/* דוגמה לשקופיות קיימות */}
              <div className="p-3 border border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl cursor-pointer">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-white text-emerald-700 mb-1 inline-block">1. טריוויה</span>
                <p className="text-sm font-bold truncate">מהי בירת ישראל?</p>
              </div>
              <div className="p-3 border border-gray-200 dark:border-white/10 rounded-xl cursor-pointer opacity-70 hover:opacity-100">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-700 mb-1 inline-block">2. סקר</span>
                <p className="text-sm font-bold truncate">איזה פיצה אתם מעדיפים?</p>
              </div>
            </div>
            <button className="m-4 mt-auto py-3 font-bold bg-gray-800 dark:bg-white dark:text-black text-white rounded-xl shadow-lg">
              + הוסף שקופית חדשה
            </button>
          </div>
        )}
      </aside>

      {/* ---------------- CENTER MAIN EDITOR (החלק השלישי - עריכת שאלות) ---------------- */}
      <div className="flex-1 overflow-y-auto p-8 relative">
        <div className="max-w-3xl mx-auto">
          
          {/* Top Types Toolbar */}
          <div className="flex justify-center gap-2 mb-8 bg-white dark:bg-[#1a0b38] p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10">
            {[
              { id: 'trivia', label: 'טריוויה' },
              { id: 'poll', label: 'סקר' },
              { id: 'image_answer', label: 'תשובה בתמונה' },
              { id: 'text_slide', label: 'טקסט' },
              { id: 'media_slide', label: 'מדיה' }
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setActiveSlideType(type.id as SlideType)}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeSlideType === type.id ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* EDITOR CARD */}
          <div className="bg-white dark:bg-[#1a0b38] rounded-3xl p-8 shadow-xl border border-gray-200 dark:border-white/10">
            
            {/* --- TYPE 1 & 2: TRIVIA / POLL --- */}
            {(activeSlideType === 'trivia' || activeSlideType === 'poll') && (
              <div className="space-y-8 animate-in fade-in">
                <div>
                  <label className="block text-sm font-bold mb-2">טקסט השאלה</label>
                  <input type="text" placeholder="הקלד את השאלה כאן..." className="w-full text-xl font-bold p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200" />
                </div>
                
                <div>
                  <label className="block text-sm font-bold mb-2">תשובות</label>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Mock Answers */}
                    {[1, 2].map(i => (
                      <div key={i} className="flex p-2 border-2 border-gray-200 rounded-xl items-center gap-2">
                        {activeSlideType === 'trivia' && (
                          <button className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-transparent hover:border-emerald-500">✓</button>
                        )}
                        <input type="text" placeholder={`תשובה ${i}`} className="w-full bg-transparent outline-none font-bold" />
                      </div>
                    ))}
                  </div>
                  <button className="mt-4 text-sm font-bold text-emerald-500">+ הוסף תשובה</button>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                  <div>
                    <label className="block text-sm font-bold mb-2">זמן תגובה (שניות)</label>
                    <input type="number" defaultValue={20} className="w-full p-3 rounded-xl border bg-gray-50" />
                  </div>
                  {activeSlideType === 'trivia' && (
                    <div>
                      <label className="block text-sm font-bold mb-2">ניקוד</label>
                      <input type="number" defaultValue={1000} className="w-full p-3 rounded-xl border bg-gray-50" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                  <MediaUploadBlock label="מדיה לפני שקופית" field="media_before" />
                  <MediaUploadBlock label="תמונת שאלה" field="question_image" />
                  <MediaUploadBlock label="מדיה אחרי" field="media_after" />
                </div>
              </div>
            )}

            {/* --- TYPE 3: IMAGE ANSWER --- */}
            {activeSlideType === 'image_answer' && (
              <div className="space-y-8 animate-in fade-in">
                <div>
                  <label className="block text-sm font-bold mb-2">נוסח השאלה</label>
                  <input type="text" placeholder="הקלד את השאלה כאן..." className="w-full text-xl font-bold p-4 rounded-xl bg-gray-50 border border-gray-200" />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold">תשובות כתמונה (עד 6)</label>
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      <input type="checkbox" className="accent-emerald-500 w-4 h-4" /> אפשר מספר תשובות נכונות
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     {/* Image Answers Mock */}
                     {[1, 2].map(i => (
                      <div key={i} className="border-2 border-gray-200 rounded-xl p-2">
                        <div className="h-32 bg-gray-100 dark:bg-white/5 rounded-lg flex flex-col items-center justify-center mb-2 cursor-pointer hover:bg-gray-200">
                          <ImageIcon size={24} className="text-gray-400 mb-2"/>
                          <span className="text-xs font-bold text-gray-500">תשובה {i} - אין תמונה</span>
                        </div>
                        <button className="w-full py-1 text-xs font-bold border rounded bg-white text-emerald-600">בחר תשובה נכונה ✓</button>
                      </div>
                    ))}
                  </div>
                  <button className="mt-4 text-sm font-bold text-emerald-500">+ הוסף תשובה</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                  <MediaUploadBlock label="מדיה לפני שקופית" field="media_before" />
                  <MediaUploadBlock label="תמונת שאלה" field="question_image" />
                  <MediaUploadBlock label="מדיה אחרי" field="media_after" />
                </div>
              </div>
            )}

            {/* --- TYPE 4: TEXT SLIDE --- */}
            {activeSlideType === 'text_slide' && (
              <div className="space-y-6 animate-in fade-in">
                <div>
                  <label className="block text-sm font-bold text-red-500 mb-2">שם השקופית *</label>
                  <input type="text" className="w-full p-4 rounded-xl border bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-red-500 mb-2">תוכן השקופית *</label>
                  <textarea rows={6} placeholder="תוכן הטקסט של השקופית. ניתן להזין טקסט חופשי, רשימות וכו'." className="w-full p-4 rounded-xl border bg-gray-50 resize-none"></textarea>
                </div>
                <div className="w-1/2">
                   <MediaUploadBlock label="תמונת שאלה" field="text_image" />
                </div>
              </div>
            )}

            {/* --- TYPE 5: MEDIA SLIDE --- */}
            {activeSlideType === 'media_slide' && (
              <div className="space-y-6 animate-in fade-in">
                <div>
                  <label className="block text-sm font-bold text-red-500 mb-2">שם השקופית *</label>
                  <input type="text" className="w-full p-4 rounded-xl border bg-gray-50" />
                </div>
                
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center">
                  <h4 className="font-bold text-lg mb-2">מדיה ראשית / קישור YouTube</h4>
                  <div className="flex justify-center gap-4 mt-6">
                    <button className="px-6 py-3 bg-emerald-50 text-emerald-700 font-bold rounded-xl border border-emerald-200">העלאת קובץ מדיה (תמונה/וידאו/אודיו)</button>
                    <button className="px-6 py-3 bg-blue-50 text-blue-700 font-bold rounded-xl border border-blue-200">בחר מהגלריה</button>
                    <button className="px-6 py-3 bg-red-50 text-red-700 font-bold rounded-xl border border-red-200">הטמע מיוטיוב</button>
                  </div>
                </div>
              </div>
            )}

            <button className="w-full mt-8 py-4 font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg transition-all text-lg">
              שמירת שקופית
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}
