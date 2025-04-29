type TopBarProps = {
  title: string;
  onRunClick: () => void;
};

export default function TopBar({ title, onRunClick }: TopBarProps) {
  return (
    <div id="top-bar">
      <div className="top-bar-title">{title}</div>
      <button className="top-bar-run-button" onClick={onRunClick}>
        RUN
      </button>
    </div>
  );
}
