import { ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

export function NotAuthorized() {
  const navigate = useNavigate();
  return (
    <EmptyState
      icon={<ShieldAlert className="h-8 w-8" />}
      title="Not authorized"
      message="Your role doesn't have access to this page."
      action={
        <Button variant="secondary" onClick={() => navigate('/')}>
          Back to Dashboard
        </Button>
      }
    />
  );
}
