export default function LoadingLearningPage() {
  return (
    <main className="flow-shell" aria-busy="true">
      <div className="loading-card">
        <span className="loading-dots" aria-hidden="true"><i /><i /><i /></span>
        <strong>正在恢复这次学习</strong>
        <p>请稍等一下，不需要重新开始。</p>
      </div>
    </main>
  );
}
