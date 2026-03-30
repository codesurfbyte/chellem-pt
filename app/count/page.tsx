"use client";

import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";

const KO_COUNTS = [
    "하나", "둘", "셋", "넷", "다섯", "여섯", "일곱", "여덟", "아홉", "열",
    "열하나", "열둘", "열셋", "열넷", "열다섯", "열여섯", "열일곱", "열여덟", "열아홉", "스물",
];

const C = {
    bg: "#060606", card: "#111", border: "#1e1e1e",
    accent: "#C8FF00", accentDim: "#6B8800", accentBg: "#111800",
    teal: "#2FFFCA", tealBg: "#002820",
    red: "#FF3B30", redBg: "#220800",
    text: "#EFEFEF", muted: "#555", mid: "#888",
};

type Intensity = "normal" | "hype" | "calm";

interface StepperProps {
    label: string;
    value: number;
    onChange: (val: number) => void;
    min: number;
    max: number;
    unit: string;
    step?: number;
}

const Stepper = ({ label, value, onChange, min, max, unit, step = 1 }: StepperProps) => {
    const dec = () => onChange(+(Math.max(min, value - step)).toFixed(1));
    const inc = () => onChange(+(Math.min(max, value + step)).toFixed(1));
    const display = step < 1 ? value.toFixed(1) : value;
    return (
        <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: C.muted, textTransform: "uppercase", marginBottom: 10, fontWeight: 600 }}>{label}</div>
            <div style={{ display: "flex", alignItems: "center", background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                <button onClick={dec} style={{ width: 50, height: 50, border: "none", background: "transparent", color: value <= min ? C.muted : C.text, fontSize: 20, cursor: value <= min ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                <div style={{ flex: 1, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 34, color: C.accent, letterSpacing: 2 }}>{display}</span>
                    <span style={{ fontSize: 13, color: C.muted }}>{unit}</span>
                </div>
                <button onClick={inc} style={{ width: 50, height: 50, border: "none", background: "transparent", color: value >= max ? C.muted : C.text, fontSize: 20, cursor: value >= max ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            </div>
            <input type="range" min={min} max={max} step={step} value={value}
                onChange={e => onChange(+parseFloat(e.target.value).toFixed(1))}
                style={{ width: "100%", marginTop: 6, accentColor: C.accent, cursor: "pointer" }} />
        </div>
    );
};

interface RingProps {
    r: number;
    progress: number;
    color: string;
    sw?: number;
}

const Ring = ({ r, progress, color, sw = 5 }: RingProps) => {
    const c = 2 * Math.PI * r, offset = c * (1 - Math.min(1, Math.max(0, progress))), sz = (r + sw + 2) * 2;
    return (
        <svg width={sz} height={sz} style={{ transform: "rotate(-90deg)", position: "absolute", top: 0, left: 0 }}>
            <circle cx={sz / 2} cy={sz / 2} r={r} fill="none" stroke={C.border} strokeWidth={sw} />
            <circle cx={sz / 2} cy={sz / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
                strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.35s ease,stroke 0.2s" }} />
        </svg>
    );
};

export default function GymCoach() {
    const [screen, setScreen] = useState("settings");
    const [phase, setPhase] = useState("idle");

    // settings
    const [exerciseName, setExerciseName] = useState("스쿼트");
    const [targetReps, setTargetReps] = useState(12);
    const [targetSets, setTargetSets] = useState(4);
    const [startDelay, setStartDelay] = useState(10);
    const [restTime, setRestTime] = useState(90);
    const [countInterval, setCountInterval] = useState(3.0);

    // loading
    const [loadMsg, setLoadMsg] = useState("");
    const [loadPct, setLoadPct] = useState(0);
    const [ttsWarning, setTtsWarning] = useState("");

    // workout display
    const [currentSet, setCurrentSet] = useState(1);
    const [currentRep, setCurrentRep] = useState(0);
    const [timer, setTimer] = useState(0);
    const [encText, setEncText] = useState("");
    const [completedSets, setCompletedSets] = useState(0);
    const [repKey, setRepKey] = useState(0);
    const [barPct, setBarPct] = useState(0);

    interface Cache {
        counts: (string | null)[];
        countPlayers: (HTMLAudioElement | null)[];
    }

    // refs
    const phaseRef = useRef("idle");
    const currentSetRef = useRef(1);
    const targetSetsRef = useRef(4);
    const targetRepsRef = useRef(12);
    const restTimeRef = useRef(90);
    const startDelayRef = useRef(10);
    const countIntervalRef = useRef(3.0);
    const exerciseRef = useRef("스쿼트");
    const encsRef = useRef<{ rep: number; text: string }[]>([]);
    const restTipRef = useRef("");
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const countTORef = useRef<NodeJS.Timeout | null>(null);
    const barAnimRef = useRef<number | null>(null);
    const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
    const cache = useRef<Cache>({ counts: [], countPlayers: [] });

    // circular dep 해결용 function refs
    const autoCountRef = useRef<((repNum: number) => void) | null>(null);
    const beginSetRef = useRef<((setNum: number) => void) | null>(null);
    const beginRestRef = useRef<((completedSet: number) => void) | null>(null);

    // CSS
    useEffect(() => {
        const id = "gymc-v3";
        if (document.getElementById(id)) return;
        const s = document.createElement("style"); s.id = id;
        s.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@300;400;500;600;700&display=swap');
      @keyframes punch{0%{transform:scale(1.55);opacity:.55}100%{transform:scale(1);opacity:1}}
      @keyframes encIn{0%{opacity:0;transform:translateY(-14px)}15%,72%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(6px)}}
      @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
      .punch{animation:punch .22s ease-out forwards}
      .enc{animation:encIn 2.3s ease-out forwards}
      .blink{animation:blink 1s ease-in-out infinite}
      .spin{animation:spin .7s linear infinite}
      .up{animation:up .4s ease-out forwards}
      input[type=range]{-webkit-appearance:none;appearance:none;background:transparent}
      input[type=range]::-webkit-slider-runnable-track{height:4px;background:#1e1e1e;border-radius:2px}
      input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:15px;height:15px;border-radius:50%;background:#C8FF00;margin-top:-5.5px;cursor:pointer}
    `;
        document.head.appendChild(s);
    }, []);

    // voices + iOS unlock
    useEffect(() => {
        const load = () => { voicesRef.current = window.speechSynthesis?.getVoices() || []; };
        load(); window.speechSynthesis?.addEventListener("voiceschanged", load);
        const unlock = () => {
            const u = new SpeechSynthesisUtterance(" "); u.volume = 0;
            window.speechSynthesis?.speak(u);
            document.removeEventListener("touchstart", unlock);
            document.removeEventListener("click", unlock);
        };
        document.addEventListener("touchstart", unlock);
        document.addEventListener("click", unlock);
        return () => window.speechSynthesis?.removeEventListener("voiceschanged", load);
    }, []);

    // Web Speech fallback - 최대한 남성 pitch
    const speak = useCallback((text: string, intensity: Intensity = "normal") => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text); u.lang = "ko-KR";
        const p = { normal: { rate: 1.05, pitch: 0.82, volume: 1 }, hype: { rate: 1.22, pitch: 0.88, volume: 1 }, calm: { rate: 0.87, pitch: 0.78, volume: .9 } };
        const prof = p[intensity] || p.normal;
        Object.assign(u, prof);
        const vs = voicesRef.current;
        const v = vs.find(v => v.lang === "ko-KR" && /남|male/i.test(v.name))
            || vs.find(v => v.lang === "ko-KR" && !/여|female/i.test(v.name))
            || vs.find(v => v.lang === "ko-KR");
        if (v) u.voice = v;
        window.speechSynthesis.speak(u);
    }, []);

    // URL 재생 (없으면 Web Speech fallback)
    const playUrl = useCallback((url: string | null, fallback: string, intensity: Intensity = "normal") => {
        if (url) { new Audio(url).play().catch(() => speak(fallback, intensity)); }
        else { speak(fallback, intensity); }
    }, [speak]);

    const playCount = useCallback((index: number, fallback: string, intensity: Intensity = "normal") => {
        const player = cache.current.countPlayers[index];
        if (player) {
            player.currentTime = 0;
            player.play().catch(() => speak(fallback, intensity));
            return;
        }
        playUrl(cache.current.counts[index] ?? null, fallback, intensity);
    }, [playUrl, speak]);

    const releaseCountAudio = useCallback(() => {
        cache.current.countPlayers.forEach((player) => {
            if (!player) return;
            player.pause();
            player.src = "";
        });
        cache.current = { counts: [], countPlayers: [] };
    }, []);

    // Claude AI 추임새 + 팁
    const fetchAI = async (exercise: string, reps: number) => {
        setLoadMsg("AI 코치 멘트 생성 중...");
        try {
            const res = await fetch("/api/ai-coach", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ exercise, reps }),
            });
            if (!res.ok) throw new Error("AI service unavailable");
            const d = await res.json();
            return JSON.parse((d.content?.[0]?.text || "{}").replace(/```json|```/g, "").trim());
        } catch {
            return {
                encouragements: Array.from({ length: reps }, (_, i) => ({
                    rep: i + 1,
                    text: i + 1 === reps ? "마지막!" : i + 1 >= reps - 1 ? "거의다!" : i + 1 === Math.ceil(reps / 2) ? "반 왔어!" : i + 1 <= 2 ? "파이팅!" : "좋아!"
                })),
                restTip: `${exercise} 동작 시 목표 근육 자극에 집중하세요. 호흡을 고르게 하며 다음 세트를 준비하세요.`,
            };
        }
    };

    // 타이머
    const startTimer = useCallback((duration: number, onTick?: (rem: number) => void, onDone?: () => void) => {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimer(duration);
        timerRef.current = setInterval(() => {
            setTimer(prev => {
                const next = prev - 1;
                if (onTick) onTick(next);
                if (next <= 0) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    if (onDone) setTimeout(onDone, 50);
                    return 0;
                }
                return next;
            });
        }, 1000);
    }, []);

    // 인터벌 진행바 (rAF 기반)
    const startBar = useCallback((ms: number) => {
        if (barAnimRef.current !== null) cancelAnimationFrame(barAnimRef.current);
        const t0 = performance.now();
        const tick = (now: number) => {
            const pct = Math.max(0, 1 - (now - t0) / ms);
            setBarPct(pct);
            if (pct > 0) barAnimRef.current = requestAnimationFrame(tick);
        };
        barAnimRef.current = requestAnimationFrame(tick);
    }, []);

    // 자동 카운트 (핵심 루프)
    const autoCount = useCallback((repNum: number) => {
        if (phaseRef.current !== "counting") return;
        const tr = targetRepsRef.current;
        const intervalMs = countIntervalRef.current * 1000;
        const isAlmost = repNum >= tr - 1;

        setCurrentRep(repNum);
        setRepKey(k => k + 1);

        // 카운트 음성만 재생
        playCount(repNum - 1, KO_COUNTS[repNum - 1] || String(repNum), isAlmost ? "hype" : "normal");

        // 격려 (680ms 후)
        const encItem = encsRef.current.find(e => e.rep === repNum);
        if (encItem?.text) {
            setTimeout(() => {
                if (phaseRef.current !== "counting") return;
                setEncText(encItem.text);
                setTimeout(() => setEncText(""), 2200);
            }, 680);
        }

        // 진행바
        if (repNum < tr) startBar(intervalMs);

        // 다음 스케줄
        if (repNum >= tr) {
            countTORef.current = setTimeout(() => {
                if (phaseRef.current !== "counting") return;
                if (currentSetRef.current >= targetSetsRef.current) {
                    setScreen("complete"); setPhase("idle"); phaseRef.current = "idle";
                    setTimeout(() => setEncText("운동 완료"), 400);
                } else {
                    beginRestRef.current?.(currentSetRef.current);
                }
            }, intervalMs);
        } else {
            countTORef.current = setTimeout(() => autoCountRef.current?.(repNum + 1), intervalMs);
        }
    }, [playCount, startBar]);

    // 세트 시작
    const beginSet = useCallback((setNum: number) => {
        setPhase("counting"); phaseRef.current = "counting";
        setCurrentSet(setNum); currentSetRef.current = setNum;
        setCurrentRep(0); setCompletedSets(setNum - 1);
        if (barAnimRef.current !== null) cancelAnimationFrame(barAnimRef.current);
        setBarPct(0);
        countTORef.current = setTimeout(() => autoCountRef.current?.(1), 250);
    }, []);

    // 휴식 시작
    const beginRest = useCallback((completedSet: number) => {
        if (countTORef.current) clearTimeout(countTORef.current);
        if (barAnimRef.current !== null) cancelAnimationFrame(barAnimRef.current);
        setPhase("rest"); phaseRef.current = "rest";
        setCompletedSets(completedSet);
        currentSetRef.current = completedSet + 1;
        setCurrentSet(completedSet + 1); setBarPct(0);
        const rt = restTimeRef.current;
        startTimer(rt,
            () => {},
            () => beginSetRef.current?.(completedSet + 1)
        );
    }, [startTimer]);

    // function refs 연결 (매 렌더마다 최신 유지)
    autoCountRef.current = autoCount;
    beginSetRef.current = beginSet;
    beginRestRef.current = beginRest;

    // 운동 시작
    const startWorkout = useCallback(() => {
        setScreen("workout");
        setCurrentSet(1); currentSetRef.current = 1;
        setCurrentRep(0); setCompletedSets(0);
        if (startDelayRef.current > 0) {
            setPhase("delay"); phaseRef.current = "delay";
            setTimer(startDelayRef.current);
            startTimer(startDelayRef.current,
                () => {},
                () => beginSetRef.current?.(1)
            );
        } else {
            beginSetRef.current?.(1);
        }
    }, [startTimer]);

    // 전체 준비 (정적 카운트 음성 사전 로드)
    const prepare = async () => {
        setScreen("loading"); setLoadPct(0);
        setTtsWarning("");
        targetSetsRef.current = targetSets; targetRepsRef.current = targetReps;
        restTimeRef.current = restTime; startDelayRef.current = startDelay;
        countIntervalRef.current = countInterval; exerciseRef.current = exerciseName;
        releaseCountAudio();

        const ai = await fetchAI(exerciseName, targetReps);
        encsRef.current = ai.encouragements || []; restTipRef.current = ai.restTip || "";
        setLoadPct(18);
        setLoadMsg("카운트 음성 미리 준비 중...");
        const sourceUrls = Array.from({ length: targetReps }, (_, i) => `/count-audio/${i + 1}.mp3`);
        cache.current.counts = sourceUrls;
        cache.current.countPlayers = await Promise.all(sourceUrls.map((url) => new Promise<HTMLAudioElement | null>((resolve) => {
            const player = new Audio(url);
            player.preload = "auto";

            const cleanup = () => {
                player.removeEventListener("canplaythrough", handleReady);
                player.removeEventListener("error", handleError);
            };

            const handleReady = () => {
                cleanup();
                resolve(player);
            };

            const handleError = () => {
                cleanup();
                resolve(null);
            };

            player.addEventListener("canplaythrough", handleReady, { once: true });
            player.addEventListener("error", handleError, { once: true });
            player.load();

            // iOS can be conservative with preload; don't block the whole flow forever.
            window.setTimeout(() => {
                cleanup();
                resolve(player.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA ? player : null);
            }, 2000);
        })));
        if (cache.current.countPlayers.some((player) => !player)) {
            setTtsWarning("일부 카운트 파일을 미리 불러오지 못해 해당 숫자는 즉시 재생되지 않을 수 있습니다.");
        }
        setLoadPct(100);
        await new Promise(r => setTimeout(r, 350));
        startWorkout();
    };

    const handleReset = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (countTORef.current) clearTimeout(countTORef.current);
        if (barAnimRef.current !== null) cancelAnimationFrame(barAnimRef.current);
        window.speechSynthesis?.cancel();
        releaseCountAudio();
        phaseRef.current = "idle";
        setScreen("settings"); setPhase("idle");
        setCurrentRep(0); setCurrentSet(1); currentSetRef.current = 1;
        setCompletedSets(0); setEncText(""); setBarPct(0);
    };

    useEffect(() => {
        return () => releaseCountAudio();
    }, [releaseCountAudio]);

    const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    const wrap: CSSProperties = {
        minHeight: "100vh",
        background: C.bg,
        fontFamily: "'Barlow Condensed','Arial Narrow',sans-serif",
        color: C.text,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        maxWidth: 480,
        margin: "0 auto",
    };

    // ── COMPLETE ──
    if (screen === "complete") return (
        <div style={{ ...wrap, justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
            <div className="up">
                <div style={{ fontSize: 68, marginBottom: 4 }}>🏆</div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 70, color: C.accent, letterSpacing: 5, lineHeight: 1 }}>완 료</div>
                <div style={{ fontSize: 22, color: C.mid, marginTop: 8 }}>{exerciseName}</div>
                <div style={{ display: "flex", gap: 28, justifyContent: "center", marginTop: 28 }}>
                    {[["총 횟수", `${targetReps * targetSets}회`], ["세트", `${targetSets}세트`], ["세트당", `${targetReps}회`]].map(([k, v]) => (
                        <div key={k}>
                            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 42, color: C.accent }}>{v}</div>
                            <div style={{ fontSize: 10, letterSpacing: 2.5, color: C.muted, textTransform: "uppercase" }}>{k}</div>
                        </div>
                    ))}
                </div>
            </div>
            <button onClick={handleReset} style={{ marginTop: 52, padding: "16px 0", width: 260, background: "transparent", border: `1.5px solid ${C.accent}`, color: C.accent, fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, letterSpacing: 5, borderRadius: 10, cursor: "pointer" }}>다시 설정</button>
        </div>
    );

    // ── LOADING ──
    if (screen === "loading") return (
        <div style={{ ...wrap, justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 52, color: C.accent, letterSpacing: 4, marginBottom: 6 }}>GYM COACH</div>
            <div style={{ fontSize: 15, color: C.muted, letterSpacing: 2, marginBottom: 40 }}>{exerciseName} · {targetReps}회 × {targetSets}세트</div>
            <div className="spin" style={{ width: 48, height: 48, borderRadius: "50%", border: `3px solid ${C.border}`, borderTopColor: C.accent, marginBottom: 28 }} />
            <div style={{ fontSize: 17, color: C.text, letterSpacing: 1, marginBottom: 24, minHeight: 24 }}>{loadMsg}</div>
            <div style={{ width: "100%", maxWidth: 320, height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", background: C.accent, borderRadius: 2, width: `${loadPct}%`, transition: "width 0.4s ease" }} />
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 10 }}>{loadPct}%</div>
            <div style={{ marginTop: 28, fontSize: 13, color: C.muted, maxWidth: 280, lineHeight: 1.8 }}>로컬 카운트 음성 파일 사용 중<br /><span style={{ color: C.mid }}>운동 중에는 네트워크 없이 바로 재생됩니다.</span></div>
        </div>
    );

    // ── WORKOUT ──
    if (screen === "workout") {
        const isAlmost = phase === "counting" && (targetReps - currentRep) <= 2 && currentRep > 0;
        const ringColor = isAlmost ? C.red : phase === "rest" ? C.teal : C.accent;
        const repProg = targetReps > 0 ? currentRep / targetReps : 0;
        const timerMax = phase === "delay" ? startDelay : restTime;
        const timerProg = timerMax > 0 ? Math.max(0, (timerMax - timer) / timerMax) : 0;
        const R = 118, RSZ = (R + 7 + 2) * 2;
        return (
            <div style={{ ...wrap, justifyContent: "space-between" }}>
                {/* 상단 */}
                <div style={{ width: "100%", padding: "18px 20px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <div style={{ fontSize: 10, letterSpacing: 3, color: C.muted, textTransform: "uppercase", marginBottom: 2 }}>{exerciseName}</div>
                        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 2 }}>
                            {phase === "delay" && "준비 중"}
                            {phase === "counting" && `${currentSet} / ${targetSets} 세트`}
                            {phase === "rest" && `휴식 → ${currentSet}세트 준비`}
                        </div>
                    </div>
                    <button onClick={handleReset} style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, fontSize: 13, cursor: "pointer" }}>중단</button>
                </div>

                {/* 세트 점 */}
                <div style={{ display: "flex", gap: 10, padding: "16px 0 0", alignItems: "center" }}>
                    {Array.from({ length: targetSets }).map((_, i) => {
                        const done = i < completedSets, active = i === currentSet - 1 && phase !== "rest";
                        return <div key={i} style={{ width: done ? 11 : active ? 13 : 7, height: done ? 11 : active ? 13 : 7, borderRadius: "50%", background: done ? C.accent : active ? ringColor : "transparent", border: `2px solid ${done ? C.accent : active ? ringColor : C.border}`, boxShadow: active ? `0 0 10px ${ringColor}99` : "none", transition: "all 0.3s" }} />;
                    })}
                </div>

                {/* 메인 링 */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4px 0" }}>
                    <div style={{ position: "relative", width: RSZ, height: RSZ, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Ring r={R} progress={phase === "counting" ? repProg : timerProg} color={ringColor} sw={5} />
                        <div style={{ textAlign: "center", zIndex: 1 }}>
                            {phase === "counting" && (
                                <>
                                    <div key={repKey} className="punch" style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: currentRep === 0 ? 74 : 148, lineHeight: 1, letterSpacing: 2, color: isAlmost ? C.red : C.accent, textShadow: `0 0 50px ${isAlmost ? C.red : C.accent}44`, transition: "color 0.2s" }}>
                                        {currentRep === 0 ? "GO!" : currentRep}
                                    </div>
                                    {currentRep > 0 && <div style={{ fontSize: 14, color: C.muted, letterSpacing: 2, marginTop: 2 }}>/ {targetReps} 회</div>}
                                    {currentRep === 0 && <div className="blink" style={{ fontSize: 12, color: C.muted, letterSpacing: 3, marginTop: 10 }}>준비...</div>}
                                </>
                            )}
                            {(phase === "delay" || phase === "rest") && (
                                <>
                                    <div className={timer <= 5 && timer > 0 ? "blink" : ""} style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 100, lineHeight: 1, letterSpacing: 2, color: phase === "rest" ? C.teal : C.text }}>{fmt(timer)}</div>
                                    <div style={{ fontSize: 12, letterSpacing: 4, color: C.muted, textTransform: "uppercase", marginTop: 4 }}>{phase === "delay" ? "준비" : "휴식"}</div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* 카운트 간격 진행바 */}
                    {phase === "counting" && currentRep > 0 && currentRep < targetReps && (
                        <div style={{ width: RSZ * 0.72, marginTop: 14 }}>
                            <div style={{ fontSize: 10, letterSpacing: 2, color: C.muted, textTransform: "uppercase", marginBottom: 6, textAlign: "center" }}>
                                다음 카운트 {countInterval.toFixed(1)}s
                            </div>
                            <div style={{ width: "100%", height: 3, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                                <div style={{ height: "100%", borderRadius: 2, background: isAlmost ? C.red : C.accent, width: `${barPct * 100}%`, transition: "background 0.2s" }} />
                            </div>
                        </div>
                    )}

                    {/* 격려 */}
                    <div style={{ height: 50, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 10 }}>
                        {encText && <div key={encText + repKey} className="enc" style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 38, letterSpacing: 4, color: isAlmost ? C.red : C.accent, textShadow: `0 0 20px ${isAlmost ? C.red : C.accent}88` }}>{encText}</div>}
                    </div>

                    {/* 휴식 팁 */}
                    {phase === "rest" && restTipRef.current && (
                        <div className="up" style={{ maxWidth: 340, margin: "0 24px", padding: "16px 20px", background: C.tealBg, borderRadius: 12, border: `1px solid ${C.teal}33`, textAlign: "center" }}>
                            <div style={{ fontSize: 10, letterSpacing: 3, color: C.teal, textTransform: "uppercase", marginBottom: 8 }}>트레이너 팁</div>
                            <div style={{ fontSize: 15, color: C.text, lineHeight: 1.7 }}>{restTipRef.current}</div>
                        </div>
                    )}
                </div>

                {/* 하단 상태 */}
                <div style={{ width: "100%", padding: "0 20px 28px" }}>
                    <div style={{ width: "100%", height: 64, background: phase === "counting" ? (isAlmost ? C.redBg : C.accentBg) : C.card, border: `1px solid ${phase === "counting" ? (isAlmost ? C.red : C.accent) : C.border}`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, boxShadow: phase === "counting" ? `0 0 24px ${isAlmost ? C.red : C.accent}18` : "none", transition: "all 0.3s" }}>
                        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, letterSpacing: 4, color: phase === "counting" ? (isAlmost ? C.red : C.accent) : C.muted }}>
                            {phase === "counting" ? currentRep === 0 ? "자동 시작 중..." : `자동 카운트 · ${countInterval.toFixed(1)}s 간격` : phase === "delay" ? "잠시 후 시작..." : "다음 세트 준비 중..."}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── SETTINGS ──
    return (
        <div style={{ ...wrap }}>
            <div style={{ width: "100%", padding: "30px 24px 22px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, letterSpacing: 5, color: C.accentDim, textTransform: "uppercase", marginBottom: 4, fontWeight: 700 }}>GYM COACH AI</div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 52, letterSpacing: 3, lineHeight: 1 }}>운동 설정</div>
            </div>

            <div style={{ width: "100%", padding: "26px 24px 40px", overflowY: "auto" }}>

                {/* Count Audio */}
                <div style={{ marginBottom: 26 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <div style={{ fontSize: 10, letterSpacing: 3, color: C.muted, textTransform: "uppercase", fontWeight: 600 }}>Count Audio</div>
                        <div style={{ fontSize: 11, color: C.teal }}>✓ 정적 MP3 사용</div>
                    </div>
                    <div style={{ padding: "13px 14px", background: C.card, border: `1px solid ${C.teal}66`, borderRadius: 10, color: C.text, fontSize: 14, lineHeight: 1.7 }}>
                        경로: `/public/count-audio/1.mp3` ~ `/public/count-audio/20.mp3`
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 8, lineHeight: 1.7 }}>
                        카운트 숫자만 사전 생성한 로컬 음성 파일을 사용합니다.<br />
                        <span style={{ color: C.mid }}>운동 중 TTS 호출이 없어 지연이 가장 적습니다.</span>
                    </div>
                    {ttsWarning && <div style={{ fontSize: 12, color: "#ffb020", marginTop: 8, lineHeight: 1.7 }}>
                        {ttsWarning}
                    </div>}
                </div>

                <div style={{ width: "100%", height: 1, background: C.border, marginBottom: 24 }} />

                {/* 운동 이름 */}
                <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 10, letterSpacing: 3, color: C.muted, textTransform: "uppercase", marginBottom: 10, fontWeight: 600 }}>운동 이름</div>
                    <input value={exerciseName} onChange={e => setExerciseName(e.target.value)} placeholder="스쿼트, 푸시업, 데드리프트..."
                        style={{ width: "100%", padding: "13px 14px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 22, fontWeight: 600, fontFamily: "'Barlow Condensed',sans-serif", outline: "none" }}
                        onFocus={e => e.target.style.borderColor = C.accent}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                        {["스쿼트", "푸시업", "데드리프트", "런지", "풀업", "벤치프레스"].map(ex => (
                            <button key={ex} onClick={() => setExerciseName(ex)} style={{ padding: "5px 12px", background: exerciseName === ex ? C.accentBg : C.card, border: `1px solid ${exerciseName === ex ? C.accent : C.border}`, color: exerciseName === ex ? C.accent : C.muted, borderRadius: 20, fontSize: 13, cursor: "pointer", fontFamily: "'Barlow Condensed',sans-serif" }}>{ex}</button>
                        ))}
                    </div>
                </div>

                <div style={{ width: "100%", height: 1, background: C.border, marginBottom: 24 }} />

                <Stepper label="횟수 (1세트)" value={targetReps} onChange={setTargetReps} min={1} max={20} unit="회" />
                <Stepper label="세트 수" value={targetSets} onChange={setTargetSets} min={1} max={10} unit="세트" />

                <div style={{ width: "100%", height: 1, background: C.border, margin: "4px 0 24px" }} />

                {/* 카운트 간격 - 신규 */}
                <div style={{ padding: "16px", background: C.accentBg, borderRadius: 10, border: `1px solid ${C.accent}22`, marginBottom: 20 }}>
                    <Stepper label="카운트 간격" value={countInterval} onChange={setCountInterval} min={0.5} max={5.0} step={0.5} unit="초" />
                    <div style={{ fontSize: 12, color: C.muted, marginTop: -12, lineHeight: 1.8 }}>
                        예: 2.0초 → 하나... 둘... 셋... &nbsp;<span style={{ color: C.accentDim }}>0.5초 단위로 조절</span>
                    </div>
                </div>

                <Stepper label="시작 딜레이" value={startDelay} onChange={setStartDelay} min={0} max={60} unit="초" />
                <Stepper label="세트간 휴식" value={restTime} onChange={setRestTime} min={10} max={180} unit="초" />

                {/* 요약 */}
                <div style={{ padding: "14px 16px", background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, color: C.muted, lineHeight: 2, marginBottom: 20 }}>
                    <span style={{ color: C.accent, fontWeight: 700 }}>{exerciseName}</span> · {targetReps}회 × {targetSets}세트 = <span style={{ color: C.text }}>{targetReps * targetSets}회</span><br />
                    간격 <span style={{ color: C.text }}>{countInterval.toFixed(1)}초</span> · 딜레이 <span style={{ color: C.text }}>{startDelay}초</span> · 휴식 <span style={{ color: C.text }}>{restTime}초</span><br />
                    예상 <span style={{ color: C.text }}>{Math.round(((targetReps * countInterval + restTime) * targetSets + startDelay) / 60 * 10) / 10}분</span>
                </div>

                <button onClick={prepare} disabled={!exerciseName.trim()}
                    style={{ width: "100%", height: 68, background: exerciseName.trim() ? C.accent : C.accentDim, border: "none", borderRadius: 10, cursor: exerciseName.trim() ? "pointer" : "not-allowed", fontFamily: "'Bebas Neue',sans-serif", fontSize: 30, letterSpacing: 6, color: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    운동 시작
                </button>
            </div>
        </div>
    );
}
