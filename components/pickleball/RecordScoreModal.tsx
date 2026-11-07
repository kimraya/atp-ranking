'use client'

import { Modal, Btn } from './ui';

// Placeholder: score entry will be built separately and plugs in here.
// It receives the match id (see CourtCard and MatchLog, which both open this).
export default function RecordScoreModal({ matchId, onClose }: { matchId: string; onClose: () => void }) {
  return (
    <Modal title="Record score" onClose={onClose}>
      <p className="text-sm font-bold text-gray-600">Score entry coming soon.</p>
      <p className="text-[11px] font-bold text-gray-400">Match {matchId}</p>
      <Btn tone="dark" full onClick={onClose}>Close</Btn>
    </Modal>
  );
}
