/** 객관식/드롭다운 질문의 선택지 목록을 편집한다. */
export default function OptionListEditor({
  options,
  onChange,
}: {
  options: string[]
  onChange: (next: string[]) => void
}) {
  function updateAt(index: number, value: string) {
    onChange(options.map((option, i) => (i === index ? value : option)))
  }

  function removeAt(index: number) {
    onChange(options.filter((_, i) => i !== index))
  }

  return (
    <div className="stack stack--sm">
      <span className="label">선택지</span>

      {options.map((option, index) => (
        <div className="row" key={index}>
          <input
            className="input"
            style={{ flex: 1, minWidth: 140 }}
            value={option}
            onChange={(e) => updateAt(index, e.target.value)}
            placeholder={`선택지 ${index + 1}`}
            aria-label={`선택지 ${index + 1}`}
          />
          <button
            className="btn btn--sm btn--danger"
            type="button"
            onClick={() => removeAt(index)}
            disabled={options.length <= 1}
            aria-label={`선택지 ${index + 1} 삭제`}
          >
            삭제
          </button>
        </div>
      ))}

      <button
        className="btn btn--sm"
        type="button"
        onClick={() => onChange([...options, ''])}
        style={{ alignSelf: 'flex-start' }}
      >
        선택지 추가
      </button>
    </div>
  )
}
