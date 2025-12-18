import React from 'react';

type BadgeType =
  | 'question-id'
  | 'question-type'
  | 'logic-default'
  | 'logic-conditional'
  | 'logic-show'
  | 'dynamic'
  | 'randomized';

interface BadgeProps {
  type: BadgeType;
  children: React.ReactNode;
  icon?: string;
}

export const Badge: React.FC<BadgeProps> = ({ type, children, icon }) => {
  const badgeClass = `badge badge-${type} badge-text`;

  return (
    <span className={badgeClass}>
      {icon && <span>{icon}</span>}
      {children}
    </span>
  );
};

interface BadgeGroupProps {
  children: React.ReactNode;
}

export const BadgeGroup: React.FC<BadgeGroupProps> = ({ children }) => {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {children}
    </div>
  );
};
