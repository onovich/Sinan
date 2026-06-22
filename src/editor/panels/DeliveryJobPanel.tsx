import { useState } from 'react';

import { DeliveryEndpointComponentSchema } from '../../schemas/component.schema';
import { DeliveryJobSchema, type DeliveryJobData } from '../../schemas/delivery.schema';
import type { LevelData } from '../../schemas/level.schema';

export interface DeliveryJobPanelProps {
  level: LevelData | null;
  onApplyJob: (job: DeliveryJobData) => void;
}

interface DeliveryJobDraftState {
  job: DeliveryJobData;
  jobId: string;
  sourceSignature: string;
}

export function DeliveryJobPanel({ level, onApplyJob }: DeliveryJobPanelProps) {
  const jobs = level?.deliveryJobs ?? [];
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>(jobs[0]?.id);
  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? jobs[0];
  const sourceSignature = selectedJob ? JSON.stringify(selectedJob) : '';
  const [draftState, setDraftState] = useState<DeliveryJobDraftState>();
  const draftJob =
    selectedJob &&
    draftState?.jobId === selectedJob.id &&
    draftState.sourceSignature === sourceSignature
      ? draftState.job
      : selectedJob;
  const validation = draftJob ? DeliveryJobSchema.safeParse(draftJob) : undefined;
  const validationMessages =
    validation && !validation.success
      ? validation.error.issues.map((issue) => `${issue.path.join('.') || 'job'}: ${issue.message}`)
      : [];
  const canApply =
    Boolean(selectedJob) &&
    validation?.success === true &&
    JSON.stringify(validation.data) !== JSON.stringify(selectedJob);

  const updateDraft = (job: DeliveryJobData) => {
    setDraftState({
      job,
      jobId: job.id,
      sourceSignature,
    });
  };

  const endpointLabels = level ? getEndpointLabels(level) : new Map<string, string>();

  return (
    <section className="delivery-job-panel" aria-labelledby="delivery-job-heading">
      <div className="panel-heading-row">
        <h2 id="delivery-job-heading">Delivery Jobs</h2>
        <span className="panel-count">{level ? formatCount(jobs.length, 'job') : 'Loading'}</span>
      </div>

      {jobs.length === 0 ? (
        <p className="panel-empty">{level ? 'No delivery jobs' : 'Loading delivery jobs'}</p>
      ) : (
        <>
          <label className="field-stack" htmlFor="delivery-job-select">
            <span>Job</span>
            <select
              id="delivery-job-select"
              value={draftJob?.id ?? ''}
              onChange={(event) => {
                setSelectedJobId(event.target.value);
                setDraftState(undefined);
              }}
            >
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} ({job.id})
                </option>
              ))}
            </select>
          </label>

          {draftJob ? (
            <>
              <label className="field-stack" htmlFor="delivery-job-title">
                <span>Title</span>
                <input
                  id="delivery-job-title"
                  value={draftJob.title}
                  onChange={(event) => updateDraft({ ...draftJob, title: event.target.value })}
                />
              </label>

              <label className="field-stack" htmlFor="delivery-job-description">
                <span>Description</span>
                <textarea
                  id="delivery-job-description"
                  rows={3}
                  value={draftJob.description}
                  onChange={(event) =>
                    updateDraft({ ...draftJob, description: event.target.value })
                  }
                />
              </label>

              {validationMessages.length > 0 ? (
                <ul className="validation-list" role="alert">
                  {validationMessages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              ) : null}

              <div className="event-command-row">
                <button
                  type="button"
                  disabled={!canApply}
                  onClick={() => {
                    if (validation?.success) {
                      onApplyJob(validation.data);
                      setDraftState(undefined);
                    }
                  }}
                >
                  Apply Job
                </button>
              </div>

              <dl className="inspector-list">
                <div>
                  <dt>Accept</dt>
                  <dd>{formatEndpoint(draftJob.acceptEndpointId, endpointLabels)}</dd>
                </div>
                <div>
                  <dt>Target</dt>
                  <dd>{formatEndpoint(draftJob.targetEndpointId, endpointLabels)}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{draftJob.defaultStatus}</dd>
                </div>
                <div>
                  <dt>Route</dt>
                  <dd>{formatCount(draftJob.routeHints.length, 'hint')}</dd>
                </div>
              </dl>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}

function getEndpointLabels(level: LevelData): ReadonlyMap<string, string> {
  const labels = new Map<string, string>();

  for (const entity of level.entities) {
    const result = DeliveryEndpointComponentSchema.safeParse(entity.components.DeliveryEndpoint);

    if (result.success) {
      labels.set(result.data.endpointId, result.data.label);
    }
  }

  return labels;
}

function formatEndpoint(endpointId: string, labels: ReadonlyMap<string, string>): string {
  const label = labels.get(endpointId);

  return label ? `${label} (${endpointId})` : endpointId;
}

function formatCount(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? '' : 's'}`;
}
