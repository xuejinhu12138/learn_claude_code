import { useState } from 'react';
import { useInterval } from './useInterval';

/**
 * 计算从 Hook 开始到现在经过的秒数
 * @returns 经过的秒数
 */
export function useElapsedTime(): number {
    const [seconds, setSeconds] = useState(0);

    useInterval(() => {
        setSeconds(s => s + 1);
    }, 1000);  // 每秒 +1

    return seconds;
}
