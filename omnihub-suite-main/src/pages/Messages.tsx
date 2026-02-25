import { MessengerChat } from '@/components/MessengerChat';
import { useNavigate, useSearchParams } from 'react-router-dom';

const Messages = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');

  return (
    <MessengerChat 
      isOpen={true} 
      onClose={() => navigate('/')} 
      initialUserId={userId}
    />
  );
};

export default Messages;
