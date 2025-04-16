import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Welcome() {
  const navigate = useNavigate();

  const showComingSoon = () => {
    toast('Coming soon!', {
      description: 'This feature is under development.',
      icon: '🚧',
      duration: 2000,
    });
  };

  return (
    <div className='flex flex-col gap-5 items-center justify-center h-screen'>
      <div className='flex flex-col gap-5 items-center justify-center h-screen'>
        <div className="rounded-full bg-white p-3 border-2 border-black w-fit h-fit">
          <img src="/logo.png" alt="Logo" className='w-[200px] md:w-[400px]' />
        </div>
        <h1 className="text-4xl font-extrabold text-center">Universe Wallet</h1>
        <p className="text-center text-lg font-semibold text-gray-500">Decentralised Web Wallet</p>
        <div className="flex gap-3 mt-6">
          <button 
            onClick={() => navigate('/create')} 
            className="bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 duration-200 cursor-pointer outline-none font-semibold shadow-sm"
          >
            Create New Wallet
          </button>
          <button 
            onClick={() => navigate('/import')} 
            className="border-2 border-slate-900 rounded-md px-4 py-2 bg-transparent text-slate-900 cursor-pointer font-semibold shadow-sm hover:bg-gray-50/20 duration-200"
          >
            Import Existing Wallet
          </button>
        </div>
      </div>
      <div className="mt-auto flex flex-col gap-5 justify-center items-center py-5">
        <p className="text-lg font-medium text-center">Universe wallet is now the official cryptocurrency wallet of Universe Chain</p>
        <div className="flex gap-5">
          <button onClick={showComingSoon}>
            <img src="Google.webp" alt="Play store" className="w-32 h-10 rounded-md" />
          </button>
          <button onClick={showComingSoon}>
            <img src="Appstore.png" alt="Play store" className="w-32 h-10 rounded-md" />
          </button>
        </div>
      </div>
    </div>
  );
} 