import { useState, useEffect } from 'react';
import timetableData from '../data/timetable.json';
import { useUser } from '../context/UserContext';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const parseTime = (timeStr) => {
    if (!timeStr) return { start: 0, end: 0 };
    const [start, end] = timeStr.split(' - ');
    const toMinutes = (t) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };
    return { start: toMinutes(start), end: toMinutes(end) };
};

export const useCurrentLesson = () => {
    const { userData } = useUser();
    // Use context data directly. Default to 8_green if not set.
    const selectedId = (userData.grade && userData.classColor)
        ? `${userData.grade}_${userData.classColor}`
        : '8_green';

    const [now, setNow] = useState(new Date());
    const [lessonStatus, setLessonStatus] = useState({ current: null, next: null, day: '', classInfo: null });

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        // Parse "8_green" -> grade: "8", color: "green"
        const [grade, color] = selectedId.split('_');

        // Safety check
        const gradeData = timetableData.grades[grade];
        const classInfo = (gradeData && gradeData[color])
            ? gradeData[color]
            : timetableData.grades['8']['green']; // Fallback

        const currentDayName = DAYS[now.getDay()];
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const todaySchedule = classInfo.schedule[currentDayName] || [];

        let current = null;
        let next = null;

        todaySchedule.forEach(lesson => {
            const timeSlot = timetableData.time_slots[String(lesson.period)];
            if (!timeSlot) return;

            const { start, end } = parseTime(timeSlot);
            if (currentMinutes >= start && currentMinutes <= end) {
                current = { ...lesson, timeSlot };
            } else if (currentMinutes < start && !next) {
                next = { ...lesson, timeSlot };
            }
        });

        setLessonStatus({
            current,
            next,
            day: currentDayName,
            classInfo
        });

    }, [now, selectedId]);

    return lessonStatus;
};
