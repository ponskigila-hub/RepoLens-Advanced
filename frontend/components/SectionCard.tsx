interface SectionCardProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  className?: string;
}

export default function SectionCard({ title, icon, children, className = '' }: SectionCardProps) {
  return (
    <div className={`bg-dark-800 rounded-lg border border-dark-700 p-6 shadow-lg hover:border-primary-500 transition-colors ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        {icon && <span className="text-2xl">{icon}</span>}
        <h2 className="text-xl font-bold text-gray-100">{title}</h2>
      </div>
      <div className="text-gray-300 space-y-3">
        {children}
      </div>
    </div>
  );
}

// Made with Bob
