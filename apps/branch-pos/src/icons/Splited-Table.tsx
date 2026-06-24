const SplitedTable = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width={64} height={64} viewBox="0 0 64 64" className="w-full h-full select-none">
    <defs>
      <g id="chair">
        {/* Backrest */}
        <rect x="-8" y="-28" width="16" height="5" rx="2" fill="#475569" />
        {/* Backrest support posts */}
        <path d="M -5 -23 L -5 -18 M 5 -23 L 5 -18" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
        {/* Seat Cushion */}
        <path d="M -10 -18 C -10 -21 10 -21 10 -18 L 8 -11 C 8 -9 -8 -9 -8 -11 Z" fill="#334155" />
      </g>
    </defs>

    {/* Chairs around the table */}
    <use href="#chair" transform="translate(32, 32) rotate(0)" />
    <use href="#chair" transform="translate(32, 32) rotate(120)" />
    <use href="#chair" transform="translate(32, 32) rotate(240)" />

    {/* Wedges of the table */}
    {/* Top Wedge: center translated up */}
    <path
      d="M 32 29 L 18.14 21 A 16 16 0 0 1 45.86 21 Z"
      fill="#f43f5e"
      stroke="#fff"
      strokeWidth="1"
    />
    {/* Bottom Right Wedge: center translated down-right */}
    <path
      d="M 34.6 33.5 L 48.46 25.5 A 16 16 0 0 1 34.6 49.5 Z"
      fill="#e11d48"
      stroke="#fff"
      strokeWidth="1"
    />
    {/* Bottom Left Wedge: center translated down-left */}
    <path
      d="M 29.4 33.5 L 29.4 49.5 A 16 16 0 0 1 15.54 25.5 Z"
      fill="#fda4af"
      stroke="#fff"
      strokeWidth="1"
    />
  </svg>
);

export default SplitedTable;