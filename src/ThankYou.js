import React from 'react';
import { useNavigate} from 'react-router-dom';

const ThankYou = () => {
  const navigate = useNavigate();

  return (
    <div>
      <h1>Thank You for Signing Up!</h1>
      <p>We’ve sent a confirmation link to your email. Please verify your account.</p>
      <button onClick={() => history.push('/questionnaire')}>Go to Questionnaire</button>
    </div>
  );
};

export default ThankYou;
