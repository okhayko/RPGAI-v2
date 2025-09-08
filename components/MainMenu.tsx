
import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

export const MainMenu: React.FC<{ 
    onStartNewAdventure: () => void; 
    onQuickPlay?: () => Promise<void>;
    hasLastWorldSetup?: boolean;
    onOpenApiSettings: () => void; 
    onLoadGameFromFile: (file: File) => void;
    isUsingDefaultKey: boolean;
    onOpenChangelog: () => void;
    selectedAiModel: string;
}> = ({ onStartNewAdventure, onQuickPlay, hasLastWorldSetup, onOpenApiSettings, onLoadGameFromFile, isUsingDefaultKey, onOpenChangelog, selectedAiModel }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hovered, setHovered] = useState<number | null>(null);
    const [isMuted, setIsMuted] = useState(false);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onLoadGameFromFile(file);
        }
        // Reset file input to allow selecting the same file again
        if (event.target) {
            event.target.value = '';
        }
    };

    const handleLoadButtonClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        } else {
            // Fallback: create a temporary input
            const tempInput = document.createElement('input');
            tempInput.type = 'file';
            tempInput.accept = '.json';
            tempInput.onchange = (e) => {
                const target = e.target as HTMLInputElement;
                const file = target.files?.[0];
                if (file) {
                    onLoadGameFromFile(file);
                }
            };
            tempInput.click();
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    // Create menu items array with functions
    const menuItems = [
        { text: "Tạo Thế Giới Mới", onClick: onStartNewAdventure },
        ...(hasLastWorldSetup && onQuickPlay ? [{ text: "Chơi Ngay", onClick: onQuickPlay }] : []),
        { text: "Tải Game Từ Tệp (.json)", onClick: handleLoadButtonClick },
        { text: "Xem Cập Nhật Game", onClick: onOpenChangelog },
        { text: "Thiết Lập API Key", onClick: onOpenApiSettings }
    ];
    
    return (
      <div className="relative w-screen h-screen overflow-hidden">
        {/* Video background */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          src="https://dl.dropboxusercontent.com/scl/fi/tuw5q6iz0rlfvfs5s8esz/0907.mp4?rlkey=lif00z2b6ugxkzo3wz1ypuz3k"
          autoPlay
          loop
          muted
        />
        <div className="absolute inset-0 bg-black/25" />

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".json"
          className="hidden"
        />

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen">
          {/* Logo */}
          <img
            src="https://i.imgur.com/6MoKnRw.png"
            alt="Game Logo"
            className="w-[320px] md:w-[420px] drop-shadow-[0_0_20px_rgba(255,230,150,0.7)] mb-12"
          />
          
          {/* Nút âm thanh tròn nhỏ */}
          <button
            onClick={toggleMute}
            className="w-10 h-10 mb-3 rounded-full bg-black/60 border border-yellow-300 flex items-center justify-center text-yellow-300 hover:bg-yellow-400/20 transition"
          >
            {isMuted ? "🔇" : "🔊"}
          </button>
          
          {/* Menu buttons */}
          <div className="flex flex-col gap-3 w-[500px] md:w-[650px] items-center p-0">
            {menuItems.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.15 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
                onClick={item.onClick}
                className="relative w-[250px] h-[60px] flex items-center justify-center cursor-pointer"
                style={{
                  backgroundImage:
                    "url('https://i.imgur.com/fvWzHiJ.png')",
                  backgroundSize: "100% 100%",
                  backgroundRepeat: "no-repeat",
                }}
              >
                <span
                  className={`text-lg md:text-xl font-semibold tracking-wide transition-all
                    ${
                      hovered === index
                        ? "text-yellow-300 drop-shadow-[0_0_8px_rgba(255,230,150,0.8)]"
                        : "text-yellow-200"
                    }
                  `}
                >
                  {item.text}
                </span>
              </motion.div>
            ))}

            <p className="text-sm text-gray-300 mt-4 italic">
              Model AI hiện tại:{" "}
              <span className="text-yellow-200">{selectedAiModel}</span>
            </p>
          </div>
        </div>
      </div>
    );
};
