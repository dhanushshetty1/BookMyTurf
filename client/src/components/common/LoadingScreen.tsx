import React from 'react';
import { motion } from 'framer-motion';
import '../../styles/onboarding.css';

interface LoadingScreenProps {
  progress?: number;
  message?: string;
  fullScreen?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  progress = 100, 
  message = "Your game starts here",
  fullScreen = true
}) => {
  return (
    <motion.section
      className={`bmt-splash-container ${fullScreen ? 'min-h-screen' : 'h-full'}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.015, filter: "blur(10px)" }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="bmt-splash-overlay" />
      
      <motion.div
        className="bmt-splash-content"
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="bmt-logo-wrapper"
          animate={{
            scale: [1, 1.045, 1],
            boxShadow: [
              "0 28px 80px rgba(10, 38, 71, 0.18)",
              "0 36px 100px rgba(22, 119, 190, 0.24)",
              "0 28px 80px rgba(10, 38, 71, 0.18)",
            ],
          }}
          transition={{ duration: 1.65, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.span
            className="bmt-logo-shimmer"
            animate={{ x: ["-120%", "120%"] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <img
            src="/logo-icon.png"
            alt="BookMyTurf Logo"
            className="bmt-logo-img"
          />
        </motion.div>

        <motion.div
          className="bmt-splash-text"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
        >
          <p className="bmt-splash-eyebrow">
            BookMyTurf
          </p>
          <h1 className="bmt-splash-title">
            {message}
          </h1>
        </motion.div>

        <div className="bmt-progress-container">
          <motion.div
            className="bmt-progress-bar"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 2.35, ease: [0.65, 0, 0.35, 1] }}
          />
        </div>
      </motion.div>
    </motion.section>
  );
};

export default LoadingScreen;
