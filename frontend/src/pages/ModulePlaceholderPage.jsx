import React from 'react';
import { Layers, Calendar } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';

export default function ModulePlaceholderPage({
  title = 'Module',
  section = 'General',
  plannedPhase = 'Future Phase',
  description = 'This business module is scheduled for upcoming development.',
  icon: Icon = Layers,
}) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: 'Brightloop', href: '/' },
          { label: section },
          { label: title },
        ]}
        badge={
          <Badge variant="warning" size="sm" dot>
            {plannedPhase}
          </Badge>
        }
      />

      <EmptyState
        icon={Icon}
        title={`${title} Module Under Development`}
        description={`The ${title} functionality is scheduled for implementation in ${plannedPhase}. In adherence with the project collaboration rules, no fabricated records or mock transactions are displayed.`}
        action={
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Coordinated with Developer 1 backend API contracts</span>
          </div>
        }
      />
    </div>
  );
}
