import { Link } from 'react-router-dom';
import './FindTherapistPage.css';

const TherapistCard = ({ therapist }) => {
  return (
    <div className="therapist-card">
      <img src={therapist.imageUrl} alt={`Dr. ${therapist.name}`} className="therapist-photo" />
      <h3 className="therapist-name">{therapist.name}</h3>
      <p className="therapist-title">{therapist.title}</p>
      <div className="specialty-tags">
        {therapist.specialties.map((specialty) => (
          <span key={specialty} className="tag">
            {specialty}
          </span>
        ))}
      </div>
      <p className="therapist-bio">{therapist.bio}</p>
      <Link to={`/student-dashboard/therapists/${therapist.id}`} className="view-profile-btn">
        View Profile & Book
      </Link>
    </div>
  );
};

export default TherapistCard;