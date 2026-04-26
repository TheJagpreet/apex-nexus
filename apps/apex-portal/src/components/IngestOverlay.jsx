/**
 * IngestOverlay — centered overlay toast with DNA transcription spinner
 * shown during file upload + chunking in the RAG knowledge base page.
 */
import { DNASpinner } from './Spinners'

const STAGE_LABELS = {
  loading:   'Uploading file…',
  chunking:  'Chunking document…',
  tagging:   'Generating semantic tags…',
  embedding: 'Embedding chunks…',
  storing:   'Storing vectors…',
  done:      'Complete!',
  error:     'Error occurred',
}

export default function IngestOverlay({ stage, filename, visible = false }) {
  if (!visible) return null

  const label = STAGE_LABELS[stage] || stage || 'Processing…'
  const isDone = stage === 'done'
  const isError = stage === 'error'

  return (
    <div className={`ingest-overlay ${isDone ? 'ingest-overlay--done' : ''} ${isError ? 'ingest-overlay--error' : ''}`}>
      <div className="ingest-overlay__card">
        <div className="ingest-overlay__spinner">
          <DNASpinner size={56} />
        </div>
        <div className="ingest-overlay__info">
          <div className="ingest-overlay__stage">{label}</div>
          {filename && (
            <div className="ingest-overlay__filename">{filename}</div>
          )}
        </div>
      </div>
    </div>
  )
}
