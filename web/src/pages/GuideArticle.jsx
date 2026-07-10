import { Link, useParams } from 'react-router-dom';
import { guideBySlug } from '../guides.js';

export default function GuideArticle() {
  const { slug } = useParams();
  const guide = guideBySlug(slug);

  if (!guide) {
    return (
      <>
        <div className="status error">Guide not found.</div>
        <p><Link to="/guides">← Back to guides</Link></p>
      </>
    );
  }

  return (
    <article>
      <p><Link to="/guides">← All guides</Link></p>
      <span className="spec-tag">{guide.category}</span>
      <h1 className="page" style={{ marginTop: 8 }}>{guide.title}</h1>
      {guide.updated && <p className="lead">Updated {guide.updated}</p>}
      {/* Guide HTML is authored by the site owner (trusted local Markdown). */}
      <div className="card article" dangerouslySetInnerHTML={{ __html: guide.html }} />
    </article>
  );
}
