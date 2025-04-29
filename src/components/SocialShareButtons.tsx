import React from 'react';
import { Facebook, Twitter, MessageSquare } from 'lucide-react';

interface SocialShareButtonsProps {
  url: string;
  title: string;
  text: string;
}

const SocialShareButtons: React.FC<SocialShareButtonsProps> = ({ url, title, text }) => {
  const encodedURL = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedText = encodeURIComponent(text);

  return (
    <div className="social-share-buttons flex gap-4 items-center">
      {/* Facebook */}
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedURL}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Compartilhar no Facebook"
        className="flex items-center gap-1"
      >
        <Facebook size={24} color="#1877F2" />
        <span className="hidden sm:inline">Facebook</span>
      </a>
      {/* Twitter */}
      <a
        href={`https://twitter.com/intent/tweet?url=${encodedURL}&text=${encodedText}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Compartilhar no Twitter"
        className="flex items-center gap-1"
      >
        <Twitter size={24} color="#1DA1F2" />
        <span className="hidden sm:inline">Twitter</span>
      </a>
      {/* WhatsApp */}
      <a
  href={`https://api.whatsapp.com/send?text=${encodedText}%20${encodedURL}`}
  target="_blank"
  rel="noopener noreferrer"
  aria-label="Compartilhar no WhatsApp"
  className="flex items-center gap-1"
>
  <MessageSquare size={24} color="#25D366" />
  <span className="hidden sm:inline">WhatsApp</span>
</a>


    </div>
  );
};

export default SocialShareButtons;
