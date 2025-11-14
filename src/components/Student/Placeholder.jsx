import { useParams } from 'react-router-dom';

const Placeholder = ({ title }) => {
  return (
    <div className="placeholder-page">
      <h1>{title}</h1>
      <p>This page is coming soon. Content will be added here.</p>
    </div>
  );
};

export default Placeholder;

