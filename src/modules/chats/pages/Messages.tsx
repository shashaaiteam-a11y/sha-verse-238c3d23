/**
 * Chats module - Messages page
 * Self-contained route entry for the /messages screen.
 */
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MessengerChat } from '@/modules/chats/components/MessengerChat';

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
