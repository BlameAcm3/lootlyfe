import { View, type ViewProps } from 'react-native';

import { cn } from '../../lib/cn';

type CardProps = ViewProps & {
  className?: string;
  /** Raised cards pop one elevation step (hero stats, modals, featured rows). */
  raised?: boolean;
};

export const Card = ({ className, raised, children, ...props }: CardProps) => (
  <View
    className={cn(
      'border-border rounded-3xl border p-4',
      raised ? 'bg-surface-raised' : 'bg-surface',
      className,
    )}
    {...props}
  >
    {children}
  </View>
);
