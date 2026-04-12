import React from 'react';
import { LogIn, User as UserIcon } from 'lucide-react';

const Layout = ({ children, sidebar, user, onLogin }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col h-screen overflow-hidden">
      <header className="bg-white border-b border-gray-200 h-16 flex-shrink-0 z-20 shadow-sm">
        <div className="max-w-[1920px] mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.location.reload()}>
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black shadow-lg group-hover:scale-110 transition-transform">
              AI
            </div>
            <div>
              <span className="text-xl font-black text-slate-900 tracking-tight">Coach.ai</span>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 -mt-1">Interview Prep</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <span className="text-xs font-bold text-slate-400 hidden lg:inline-block uppercase tracking-widest italic opacity-60">
              Mock the future, land the job
            </span>
            
            <div className="h-8 w-[1px] bg-slate-100 mx-2" />

            {user ? (
              <div className="flex items-center gap-3 p-1 pr-3 bg-slate-50 rounded-full border border-slate-100 hover:shadow-md transition-shadow cursor-default">
                 <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-xs ring-2 ring-white overflow-hidden shadow-sm">
                   {user.picture ? <img src={user.picture} alt="P" className="w-full h-full object-cover" /> : user.name[0]}
                 </div>
                 <div className="flex flex-col -gap-1">
                   <span className="text-xs font-black text-slate-900">{user.name}</span>
                   <span className="text-[10px] font-bold text-slate-400">Pro Member</span>
                 </div>
              </div>
            ) : (
              <button 
                onClick={onLogin}
                className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-full font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all"
              >
                <LogIn size={16} strokeWidth={3} />
                <span>SIGN IN</span>
              </button>
            )}
          </div>
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden relative">
        {sidebar && (
          <div className="flex-shrink-0 border-r border-slate-200">
             {sidebar}
          </div>
        )}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 custom-scrollbar">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
      
      <footer className="bg-white border-t border-slate-200 py-3 flex-shrink-0 z-20">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
          &copy; {new Date().getFullYear()} AI INTERVIEW COACH • BUILT FOR EXCELLENCE
        </div>
      </footer>
    </div>
  );
};

export default Layout;

export default Layout;
