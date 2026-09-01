'use client';

interface FigmaConnectFormProps {
  figmaUrl: string;
  mobileFigmaUrl: string;
  onFigmaUrlChange: (value: string) => void;
  onMobileFigmaUrlChange: (value: string) => void;
}

export function FigmaConnectForm({
  figmaUrl,
  mobileFigmaUrl,
  onFigmaUrlChange,
  onMobileFigmaUrlChange,
}: FigmaConnectFormProps) {
  return (
    <div className="figma-connect">
      <div className="import-modal-field">
        <label className="import-field-label" htmlFor="figma-url">
          Desktop frame URL <span className="import-required">*</span>
        </label>
        <p className="import-field-hint">
          Select a frame in Figma → right-click → Copy link
        </p>
        <input
          id="figma-url"
          type="url"
          className="import-modal-input"
          placeholder="https://www.figma.com/design/...?node-id=1-2"
          value={figmaUrl}
          onChange={(e) => onFigmaUrlChange(e.target.value)}
        />
      </div>

      <div className="import-modal-field">
        <label className="import-field-label" htmlFor="figma-mobile-url">
          Mobile frame URL
        </label>
        <input
          id="figma-mobile-url"
          type="url"
          className="import-modal-input"
          placeholder="Optional — same file, mobile frame"
          value={mobileFigmaUrl}
          onChange={(e) => onMobileFigmaUrlChange(e.target.value)}
        />
      </div>

      <div className="figma-setup-note">
        Requires a Figma access token in <code>.env.local</code>.{' '}
        <a
          href="https://help.figma.com/hc/en-us/articles/8085703771159"
          target="_blank"
          rel="noopener noreferrer"
        >
          Create token →
        </a>
      </div>
    </div>
  );
}
