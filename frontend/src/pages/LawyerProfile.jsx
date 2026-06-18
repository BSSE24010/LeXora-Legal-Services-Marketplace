import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';

const LawyerProfile = () => {
  const { id } = useParams();
  const [lawyer, setLawyer] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lawyerRes, reviewsRes] = await Promise.all([
          api.get(`/lawyers/${id}`),
          api.get(`/reviews/lawyer/${id}`),
        ]);
        setLawyer(lawyerRes.data.data);
        setReviews(reviewsRes.data.data || []);
      } catch (err) {
        console.error('Failed to fetch lawyer profile', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="container py-8 text-center">Loading profile...</div>;
  if (!lawyer) return <div className="container py-8 text-center text-error">Lawyer not found.</div>;

  const avgRating = lawyer.avg_rating || 0;

  return (
    <div className="container py-6 flex justify-center">
      <div className="card w-full" style={{ maxWidth: '800px' }}>

        {/* Header */}
        <div className="flex gap-6 items-center mb-6">
          <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', color: 'var(--secondary)', fontSize: '3rem' }}>
            {lawyer.full_name?.charAt(0)}
          </div>
          <div>
            <h1 className="text-primary">{lawyer.full_name}</h1>
            <p className="text-secondary" style={{ fontWeight: '500' }}>
              {lawyer.specializations?.[0]?.toUpperCase() || 'LEGAL PROFESSIONAL'}
            </p>
            <div className="flex gap-4 mt-2 text-muted" style={{ fontSize: '0.875rem' }}>
              <span><strong>License:</strong> {lawyer.bar_council_no}</span>
              <span><strong>Experience:</strong> {lawyer.years_experience} Years</span>
            </div>
            {/* Average Rating */}
            <div className="flex items-center gap-2 mt-2">
              <div style={{ display: 'flex', gap: '0.15rem' }}>
                {[1,2,3,4,5].map(star => (
                  <span key={star} style={{ color: star <= Math.round(avgRating) ? '#FFD700' : 'var(--border-color)', fontSize: '1.1rem' }}>★</span>
                ))}
              </div>
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                {avgRating > 0 ? `${avgRating} / 5` : 'No ratings yet'} ({reviews.length} reviews)
              </span>
            </div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.5rem 0' }} />

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-primary mb-2">About Advocate {lawyer.full_name?.split(' ')[0]}</h3>
            <p className="text-muted" style={{ lineHeight: '1.8' }}>
              {lawyer.bio || 'This professional has not added a detailed biography yet. They are fully verified by the LeXora platform as a legitimate practicing advocate.'}
            </p>
          </div>
          <div className="card" style={{ backgroundColor: 'var(--bg-color)', boxShadow: 'none' }}>
            <h3 className="text-primary mb-2">Contact Info</h3>
            <ul className="text-muted" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><strong>City:</strong> {lawyer.city || 'N/A'}</li>
              <li><strong>Phone:</strong> {lawyer.contact_number || 'N/A'}</li>
              <li><strong>Fee Range:</strong> Rs. {lawyer.fee_min} - {lawyer.fee_max}</li>
              <li><strong>Availability:</strong> {lawyer.availability_status?.toUpperCase()}</li>
            </ul>
            <Link to="/post-case" className="btn btn-primary w-full text-center mt-4">
              Invite to Bid on Your Case
            </Link>
          </div>
        </div>

        {/* Reviews Section */}
        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.5rem 0' }} />
        <h3 className="text-primary mb-3">
          Client Reviews {reviews.length > 0 && `(${reviews.length})`}
        </h3>
        {reviews.length === 0 ? (
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>No reviews yet for this lawyer.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reviews.map(r => (
              <div key={r.id} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.15rem', marginBottom: '0.4rem' }}>
                  {[1,2,3,4,5].map(star => (
                    <span key={star} style={{ color: star <= r.rating ? '#FFD700' : 'var(--border-color)', fontSize: '1.1rem' }}>★</span>
                  ))}
                </div>
                {r.comment && (
                  <p className="text-muted" style={{ fontSize: '0.875rem', lineHeight: '1.6' }}>{r.comment}</p>
                )}
                <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default LawyerProfile;