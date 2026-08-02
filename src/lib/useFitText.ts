import { useEffect, useRef } from 'react'

/**
 * 글자를 담긴 칸의 폭에 맞춰 한 줄로 채운다.
 *
 * 크기를 CSS에 적어두는 방법은 이 제목에 통하지 않았다. 한글 글자 폭이 글꼴마다
 * 달라서(애플은 SF Pro, 윈도우는 맑은 고딕, 안드로이드는 또 다른 글꼴) 어느 한
 * 기기에서 잰 '폭 ÷ 크기'가 다른 기기에서는 맞지 않는다. 화면 폭만 보고 계산하면
 * 글꼴이 좁은 기기에서는 제목만 오른쪽이 휑하게 빈다.
 *
 * 그래서 계산하지 않고 그리는 자리에서 잰다. 글자 폭은 크기에 비례하므로,
 * 최대 크기로 한 번 재고 넘친 비율만큼 줄이면 한 번에 답이 나온다.
 */
export function useFitText<T extends HTMLElement>(maxSize: number, minSize = 16) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    const box = el?.parentElement
    if (!el || !box) return

    function fit() {
      if (!el || !box) return

      const available = box.clientWidth
      if (available <= 0) return

      el.style.fontSize = `${maxSize}px`
      const natural = el.scrollWidth
      if (natural <= 0) return

      // 0.1px 단위로 내림해서 반올림 때문에 한 글자가 넘어가는 일을 막는다
      const fitted = Math.floor((maxSize * available * 10) / natural) / 10
      el.style.fontSize = `${Math.max(minSize, Math.min(maxSize, fitted))}px`
    }

    fit()

    // 화면을 돌리거나 창을 줄이면 칸 폭이 달라진다
    const observer = new ResizeObserver(fit)
    observer.observe(box)

    /*
     * 글꼴이 늦게 도착하면 그때 폭이 달라진다. 웹폰트를 쓰지 않아 보통은 해당이
     * 없지만, 기기에 없는 글꼴을 목록에서 찾는 동안 대체 글꼴로 한 번 그려질 수 있다.
     */
    void document.fonts?.ready.then(fit)

    return () => observer.disconnect()
  }, [maxSize, minSize])

  return ref
}
