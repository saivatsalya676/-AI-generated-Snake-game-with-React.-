/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'motion/react';

// === Grid / Game Config ===
const GRID_SIZE = 20;
const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const INITIAL_FOOD = { x: 5, y: 5 };

// === Music Tracks ===
const TRACKS = [
  {
    id: 1,
    title: "SEQ_01: MEMORY_LEAK",
    artist: "[SYSTEM.UNKNOWN]",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3",
    cover: "https://picsum.photos/seed/corrupt/400/225"
  },
  {
    id: 2,
    title: "SEQ_02: BUFFER_OVERRUN",
    artist: "DAEMON.EXEC",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3",
    cover: "https://picsum.photos/seed/fractal/400/225"
  },
  {
    id: 3,
    title: "SEQ_03: KERNEL_PANIC",
    artist: "NULL_POINTER",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
    cover: "https://picsum.photos/seed/void/400/225"
  }
];

export default function App() {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentTrack = TRACKS[currentTrackIndex];

  // Game State
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [food, setFood] = useState(INITIAL_FOOD);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isGamePaused, setIsGamePaused] = useState(false);

  const lastProcessedDirection = useRef(INITIAL_DIRECTION);
  const directionQueue = useRef<{x: number, y: number}[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;

      if (gameOver) {
        if (e.key === 'Enter') resetGame();
        return;
      }

      if (e.key === ' ') {
        e.preventDefault();
        setIsGamePaused(p => !p);
        return;
      }

      if (isGamePaused) return;

      const refDir = directionQueue.current.length > 0 
        ? directionQueue.current[directionQueue.current.length - 1] 
        : lastProcessedDirection.current;

      let newDir = null;
      switch(e.key) {
        case 'ArrowUp': case 'w': case 'W': newDir = { x: 0, y: -1 }; break;
        case 'ArrowDown': case 's': case 'S': newDir = { x: 0, y: 1 }; break;
        case 'ArrowLeft': case 'a': case 'A': newDir = { x: -1, y: 0 }; break;
        case 'ArrowRight': case 'd': case 'D': newDir = { x: 1, y: 0 }; break;
      }

      if (newDir) {
        e.preventDefault();
        if (refDir.x !== 0 && newDir.x === -refDir.x) return;
        if (refDir.y !== 0 && newDir.y === -refDir.y) return;
        directionQueue.current.push(newDir);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver, isGamePaused]);

  // Game loop
  useEffect(() => {
    if (gameOver || isGamePaused) return;
    
    const timer = setTimeout(() => {
      const head = snake[0];
      let currentDir = lastProcessedDirection.current;
      
      if (directionQueue.current.length > 0) {
        currentDir = directionQueue.current.shift()!;
        lastProcessedDirection.current = currentDir;
      }
      
      const newHead = { x: head.x + currentDir.x, y: head.y + currentDir.y };
      
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        setGameOver(true);
        return;
      }
      
      if (snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setGameOver(true);
        return;
      }
      
      const newSnake = [newHead, ...snake];
      
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(score + 10);
        let newFood;
        while (true) {
          newFood = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
          };
          if (!newSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) break;
        }
        setFood(newFood);
        setSnake(newSnake);
      } else {
        newSnake.pop();
        setSnake(newSnake);
      }
    }, 100); 

    return () => clearTimeout(timer);
  }, [snake, food, gameOver, isGamePaused, score]);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    lastProcessedDirection.current = INITIAL_DIRECTION;
    directionQueue.current = [];
    setFood(INITIAL_FOOD);
    setScore(0);
    setGameOver(false);
    setIsGamePaused(false);
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play().catch(e => console.error(e));
      setIsPlaying(!isPlaying);
    }
  };

  const playNext = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  };

  const playPrev = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [currentTrackIndex]);

  return (
    <div id="app-root" className="static-noise font-sans min-h-screen p-4 flex flex-col items-center justify-center animate-screen-tear">
      
      {/* Header */}
      <header id="app-header" className="mb-10 text-center relative z-10">
        <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-widest text-[var(--color-cyan)] glitch-text" data-text="SNAKE_PROTOCOL">SNAKE_PROTOCOL</h1>
        <p className="font-mono text-[var(--color-magenta)] text-lg mt-4 bg-[var(--color-bg)] inline-block px-2 border-l-4 border-[var(--color-cyan)]">SYS.BOOT // AUDIO_ENABLED</p>
      </header>

      {/* Main UI Layout */}
      <div id="main-layout" className="flex flex-col lg:flex-row gap-10 items-start justify-center w-full max-w-6xl z-10 relative">

        {/* Game Container */}
        <div id="game-panel" className="flex-[1.5] w-full flex flex-col items-center">
          <div id="game-board-container" className="relative w-full max-w-xl aspect-square border-4 border-[var(--color-cyan)] bg-[var(--color-bg)] overflow-hidden shadow-[8px_8px_0px_var(--color-magenta)]">
            
            {/* Score Overlay */}
            <div id="score-display" className="absolute top-2 left-2 z-10 text-[var(--color-cyan)] font-mono text-2xl font-bold uppercase bg-black/50 px-2 mix-blend-screen">
              SCORE_{score.toString().padStart(4, '0')}
            </div>

            {/* Canvas / Entities */}
            {snake.map((segment, idx) => (
              <div
                key={idx}
                className={`absolute bg-[var(--color-magenta)] ${idx === 0 ? 'z-10' : 'opacity-80'}`}
                style={{ 
                  left: `${segment.x * 5}%`, 
                  top: `${segment.y * 5}%`,
                  width: '5%',
                  height: '5%'
                }}
              />
            ))}
            <div
              id="food-entity"
              className="absolute bg-[var(--color-cyan)] animate-pulse"
              style={{ 
                left: `${food.x * 5}%`, 
                top: `${food.y * 5}%`,
                width: '5%',
                height: '5%'
              }}
            />

            {/* Overlay Modals */}
            {gameOver && (
              <div id="game-over-modal" className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20">
                <h2 className="text-[var(--color-magenta)] text-4xl md:text-5xl mb-6 glitch-text" data-text="SYSTEM_FAILURE">SYSTEM_FAILURE</h2>
                <button 
                  id="btn-restart"
                  onClick={resetGame}
                  className="px-6 py-4 bg-[var(--color-bg)] border-2 border-[var(--color-cyan)] text-[var(--color-cyan)] hover:bg-[var(--color-cyan)] hover:text-black font-sans text-xl uppercase tracking-wider transition-none shadow-[4px_4px_0px_var(--color-magenta)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 cursor-pointer"
                >
                  [ REBOOT ]
                </button>
              </div>
            )}

            {isGamePaused && !gameOver && (
              <div id="game-paused-modal" className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20">
                <h2 className="text-[var(--color-cyan)] text-3xl opacity-80 uppercase tracking-widest">HALTED</h2>
              </div>
            )}
          </div>

          <div id="game-instructions" className="mt-8 text-[var(--color-magenta)] font-mono text-xl text-center bg-black px-4 py-2 border-b-2 border-[var(--color-cyan)]">
            INPUT: [W A S D] || [ARROWS] -- INTERRUPT: [SPACE]
          </div>
        </div>

        {/* Music Player Container */}
        <div id="music-player-panel" className="flex-1 w-full max-w-sm bg-[var(--color-bg)] border-4 border-[var(--color-magenta)] shadow-[8px_8px_0px_var(--color-cyan)] p-6 z-10 flex flex-col">
          <h3 id="audio-interface-title" className="text-[var(--color-cyan)] font-sans text-sm uppercase mb-4 pb-2 border-b-2 border-[var(--color-magenta)]">
            [DAEMON.AUDIO_INTERFACE]
          </h3>
          
          <div id="album-art-container" className="relative w-full aspect-video border-2 border-[var(--color-cyan)] mb-6 bg-black overflow-hidden group">
            <img 
              id="album-art-image"
              src={currentTrack.cover} 
              alt="Track Signal" 
              className="w-full h-full object-cover opacity-50 contrast-150 grayscale mix-blend-luminosity group-hover:grayscale-0 transition-all duration-300 pointer-events-none"
              referrerPolicy="no-referrer"
            />
            {isPlaying && (
              <div id="audio-visualizer-overlay" className="absolute inset-x-0 bottom-0 top-1/2 flex items-end justify-between px-1 pb-1 opacity-80 mix-blend-screen pointer-events-none gap-1">
                  {[...Array(12)].map((_, i) => (
                    <motion.div 
                      key={i}
                      className="flex-1 bg-[var(--color-magenta)]"
                      animate={{ height: ["10%", `${Math.random() * 80 + 20}%`, "10%"] }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: Math.random() * 0.4 + 0.2, // Faster, jittery
                        ease: "linear" // Cryptic, rigid movement
                      }}
                    />
                  ))}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80 pointer-events-none" />
          </div>

          <div id="track-info" className="flex flex-col mb-8 border-l-4 border-[var(--color-cyan)] pl-4">
            <h4 id="track-title" className="text-[var(--color-cyan)] font-sans text-sm uppercase leading-relaxed">{currentTrack.title}</h4>
            <p id="track-artist" className="text-[var(--color-magenta)] font-mono text-lg mt-2 uppercase">{currentTrack.artist}</p>
          </div>

          <div id="audio-controls" className="flex items-center justify-between w-full mt-auto">
            <button id="btn-toggle-mute" onClick={toggleMute} className="text-[var(--color-magenta)] hover:text-[var(--color-cyan)] transition-colors p-2 border-2 border-transparent hover:border-[var(--color-cyan)] cursor-pointer">
              {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
            
            <div className="flex items-center space-x-4">
              <button id="btn-prev-track" onClick={playPrev} className="text-[var(--color-cyan)] hover:bg-[var(--color-cyan)] hover:text-black border-2 border-transparent p-2 transition-none cursor-pointer">
                <SkipBack size={24} className="fill-current" />
              </button>
              
              <button 
                id="btn-play-pause"
                onClick={togglePlay} 
                className="w-14 h-14 bg-black border-2 border-[var(--color-magenta)] flex items-center justify-center text-[var(--color-magenta)] hover:bg-[var(--color-magenta)] hover:text-black transition-none shadow-[4px_4px_0px_var(--color-cyan)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 cursor-pointer"
              >
                {isPlaying ? <Pause size={28} className="fill-current" /> : <Play size={28} className="fill-current ml-1" />}
              </button>

              <button id="btn-next-track" onClick={playNext} className="text-[var(--color-cyan)] hover:bg-[var(--color-cyan)] hover:text-black border-2 border-transparent p-2 transition-none cursor-pointer">
                <SkipForward size={24} className="fill-current" />
              </button>
            </div>
            
            <div className="w-10" />
          </div>

          <audio 
            id="audio-element"
            ref={audioRef} 
            src={currentTrack.url} 
            onEnded={playNext}
            autoPlay={isPlaying} 
          />
        </div>

      </div>
    </div>
  );
}
