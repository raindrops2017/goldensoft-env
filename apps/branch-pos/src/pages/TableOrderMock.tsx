import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, ShoppingBag, User, Utensils } from 'lucide-react';
import { Button } from '../components/ui/button';

export function TableOrderMock() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0710] bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-[#1c122b] dark:via-[#0d0914] dark:to-[#0a0710] text-slate-900 dark:text-white flex flex-col font-sans transition-colors duration-300">
      
      {/* Top Bar */}
      <header className="m-6 p-4 px-6 rounded-3xl bg-white/80 dark:bg-[#15111d]/80 backdrop-blur-xl border border-slate-200 dark:border-white/5 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate('/dine-in')}
            className="rounded-full w-12 h-12 flex items-center justify-center border-slate-200 dark:border-white/10 dark:bg-[#1f1a2e]"
          >
            <ArrowLeft className="w-6 h-6 text-slate-700 dark:text-slate-200" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-wide dark:text-white">Table {id}</h1>
            <p className="text-xs text-slate-500 dark:text-gray-400 font-semibold tracking-wider uppercase mt-0.5">Dine-In Operations</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-orange-500/20 bg-orange-500/10 text-orange-500">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-bold tracking-wider">00:42 MINS</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
            <User className="w-4 h-4" />
            <span className="text-xs font-bold tracking-wider">3 GUESTS</span>
          </div>
        </div>
      </header>

      {/* Main Mock Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 pb-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Menu Items list mock */}
        <section className="lg:col-span-2 bg-white/40 dark:bg-[#14101c]/40 backdrop-blur-sm border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 flex flex-col gap-6 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/5 pb-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Utensils className="w-5 h-5 text-blue-500" />
              Active Check Items
            </h2>
            <span className="text-xs font-bold bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full">CHECK #1024</span>
          </div>

          {/* List of items */}
          <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2">
            {[
              { name: 'Grilled Salmon with Herbs', qty: 1, price: 345, notes: 'Medium rare, extra lemon' },
              { name: 'Caesar Salad with Chicken', qty: 2, price: 180, notes: 'Dressing on the side' },
              { name: 'Fresh Mango Juice', qty: 3, price: 90, notes: 'No sugar' },
              { name: 'Lava Chocolate Cake', qty: 1, price: 150, notes: 'With vanilla ice cream' },
            ].map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-4 rounded-2xl bg-white/80 dark:bg-[#1c1827]/85 border border-slate-100 dark:border-white/5 shadow-sm">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white">{item.name}</h3>
                  <p className="text-xs text-slate-400 dark:text-gray-400 mt-1">{item.notes}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 dark:text-gray-400">Qty:</span>
                    <span className="text-base font-extrabold text-blue-500 dark:text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg">{item.qty}</span>
                  </div>
                  <div className="text-right min-w-[5rem]">
                    <span className="font-extrabold text-slate-800 dark:text-white">{item.price * item.qty} EGP</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 dark:border-white/5 pt-4 flex gap-4">
            <Button className="flex-1 h-14 rounded-2xl text-base font-bold bg-blue-600 hover:bg-blue-700 text-white active:scale-98 transition-all">
              Add Items to Order
            </Button>
            <Button variant="outline" className="h-14 px-6 rounded-2xl text-base font-bold border-slate-200 dark:border-white/10 dark:bg-[#1a1525] dark:text-white dark:hover:bg-white/5 active:scale-98 transition-all">
              Print Bill
            </Button>
          </div>
        </section>

        {/* Right Column: Check Summary & Actions */}
        <section className="bg-white/40 dark:bg-[#14101c]/40 backdrop-blur-sm border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/5 pb-4 mb-6">
              <ShoppingBag className="w-5 h-5 text-emerald-500" />
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Summary</h2>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm text-slate-500 dark:text-gray-400">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">1,125.00 EGP</span>
              </div>
              <div className="flex justify-between items-center text-sm text-slate-500 dark:text-gray-400">
                <span>Service Charge (12%)</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">135.00 EGP</span>
              </div>
              <div className="flex justify-between items-center text-sm text-slate-500 dark:text-gray-400">
                <span>Sales Tax (14%)</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">157.50 EGP</span>
              </div>
              <div className="border-t border-dashed border-slate-200 dark:border-white/10 my-4" />
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-slate-800 dark:text-white">Grand Total</span>
                <span className="text-2xl font-black text-emerald-500 dark:text-emerald-400">1,417.50 EGP</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 mt-8">
            <Button className="w-full h-16 rounded-2xl text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 transition-all shadow-lg shadow-emerald-950/20">
              Pay & Close Check
            </Button>
            <Button variant="outline" className="w-full h-14 rounded-2xl text-base font-bold border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 active:scale-95 transition-all">
              Void Table Check
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
