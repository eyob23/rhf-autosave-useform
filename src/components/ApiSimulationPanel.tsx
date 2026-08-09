import { RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import {
  apiSimulation,
  type ApiSimulationMode,
  useApiSimulation,
} from "../api/simulation";

const scenarioLabels: Record<ApiSimulationMode, string> = {
  normal: "Normal",
  slow: "Slow response",
  timeout: "Request timeout",
  offline: "Offline",
  "server-error": "Server error",
  flaky: "Flaky connection",
};

export function ApiSimulationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const simulation = useApiSimulation();
  const isActive =
    simulation.mode !== "normal" ||
    simulation.failNextSave ||
    simulation.affectReads;

  return (
    <div className={`api-simulator ${isOpen ? "is-open" : ""}`}>
      {isOpen && (
        <aside
          className="api-simulator-panel"
          aria-labelledby="api-simulator-title"
        >
          <div className="api-simulator-heading">
            <div>
              <span className="eyebrow">Developer tool</span>
              <h2 id="api-simulator-title">API simulation</h2>
            </div>
            <button
              className="api-simulator-icon-button"
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close API simulation"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div
            className={`api-simulator-status ${isActive ? "is-active" : ""}`}
          >
            <span aria-hidden="true" />
            <strong>{scenarioLabels[simulation.mode]}</strong>
            <small>
              {simulation.affectReads ? "Reads + saves" : "Saves only"}
            </small>
          </div>

          <div className="api-simulator-controls">
            <label>
              Scenario
              <select
                value={simulation.mode}
                onChange={(event) =>
                  apiSimulation.setMode(event.target.value as ApiSimulationMode)
                }
              >
                {Object.entries(scenarioLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Latency
              <span className="api-simulator-number">
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={simulation.latencyMs}
                  disabled={simulation.mode === "offline"}
                  onChange={(event) =>
                    apiSimulation.setLatencyMs(Number(event.target.value))
                  }
                />
                <span>ms</span>
              </span>
            </label>

            {simulation.mode === "flaky" && (
              <label>
                Failure rate
                <span className="api-simulator-range">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={simulation.failureRate * 100}
                    onChange={(event) =>
                      apiSimulation.setFailureRate(
                        Number(event.target.value) / 100,
                      )
                    }
                  />
                  <strong>{Math.round(simulation.failureRate * 100)}%</strong>
                </span>
              </label>
            )}

            <label className="api-simulator-checkbox">
              <input
                type="checkbox"
                checked={simulation.affectReads}
                onChange={(event) =>
                  apiSimulation.setAffectReads(event.target.checked)
                }
              />
              Affect read requests
            </label>
          </div>

          <div className="api-simulator-actions">
            <button
              type="button"
              className={simulation.failNextSave ? "is-armed" : ""}
              onClick={() =>
                apiSimulation.setFailNextSave(!simulation.failNextSave)
              }
            >
              {simulation.failNextSave
                ? "Next save will fail"
                : "Fail next save"}
            </button>
            <button
              type="button"
              onClick={apiSimulation.reset}
              aria-label="Reset API simulation"
              title="Reset"
            >
              <RotateCcw size={16} /> Reset
            </button>
          </div>
        </aside>
      )}

      <button
        className={`api-simulator-trigger ${isActive ? "is-active" : ""}`}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={`${isOpen ? "Close" : "Open"} API simulation`}
        aria-expanded={isOpen}
        title="API simulation"
      >
        <SlidersHorizontal size={19} />
        {isActive && <span aria-hidden="true" />}
      </button>
    </div>
  );
}
