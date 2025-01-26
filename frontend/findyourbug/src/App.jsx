import { useState, useEffect } from 'react';
import axios from 'axios';  // Import Axios for API requests
import 'bootstrap/dist/css/bootstrap.min.css'; // Import Bootstrap styles
import './App.css';

function App() {
  const [githubRepo, setGithubRepo] = useState('');
  const [alphaValue, setAlphaValue] = useState('');
  const [technique, setTechnique] = useState('');
  const [rankFusionMethod, setRankFusionMethod] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [githubStatus, setGithubStatus] = useState('');

  const techniqueMap = {
    BugLocator: 1,
    'Locus (Needs bug history file)': 2,
    BLUiR: 3,
    AmaLgam: 4,
    All: 5,
  };
  const rankFusionMap = {
    'Reciprocal Rank Fusion': 1,
    LLM: 2,
    Both: 3,
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!githubRepo || !alphaValue || !technique) {
      setMessage('Please fill all fields.');
      setLoading(false);
      return;
    }

    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setMessage('Please authenticate with GitHub first.');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('gitRepoURL', githubRepo);
    formData.append('alphaValue', alphaValue);
    formData.append('techniqueNum', techniqueMap[technique] || null);
    formData.append('rankFusionMethodNum', rankFusionMap[rankFusionMethod] || null);
    if (file) {
      formData.append('bugHistoryFile', file);
    }

    try {

      const workflowResponse = await axios.post('http://localhost:8080/api/v1/setup-workflow', {
        repoUrl: githubRepo,
        token: sessionStorage.getItem('token'),
      });
      setMessage(workflowResponse.data.message || 'Workflow configured successfully, now saving configuration...');

      const response = await axios.post('http://localhost:8080/api/config', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json'
        },
      });
      setMessage(response.data.message || 'Configuration saved successfully');
    } catch (error) {
      console.error('Error submitting form:', error);
      setMessage(error.response?.data?.message || 'Error submitting the form');
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubLogin = () => {
    const clientId = import.meta.env.VITE_CLIENT_ID;
    const redirectUri = 'http://localhost:8080/auth/callback';
    const scope = 'repo workflow'; 
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    setGithubStatus('Redirecting to GitHub for authentication...');
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    sessionStorage.setItem('token', token);
    setMessage("Github is authenticated! Fill up the form");
  }, []);


  return (
    <>    
      <div className="container mt-4">
        <h1>FindYourBug Configuration</h1>
        <p>Make sure GitHub is connected at first!</p>
       
        <form onSubmit={handleSubmit}>
          <div className="form-group mb-5 mt-5">
            <label htmlFor="textField1">Link to Github Repository: </label>
            <input 
              type="text" 
              className="form-control" 
              id="textField1" 
              placeholder="Github Repository" 
              value={githubRepo} 
              onChange={(e) => setGithubRepo(e.target.value)} 
            />
          </div>
          <div className="form-group mb-4">
            <label htmlFor="textField2">Enter alpha value: </label>
            <input 
              type="text" 
              className="form-control" 
              id="textField2" 
              placeholder="Enter alpha value" 
              value={alphaValue} 
              onChange={(e) => setAlphaValue(e.target.value)} 
            />
          </div>
          <div className="form-group mb-4">
            <label htmlFor="dropdown">Select technique type:</label>
            <select 
              className="form-control" 
              id="dropdown" 
              value={technique} 
              onChange={(e) => setTechnique(e.target.value)}
            >
              <option value="">Select a technique</option>
              {Object.keys(techniqueMap).map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group mb-4">
            <label htmlFor="rankFusionDropdown">Select Rank Fusion Method:</label>
            <select 
              className="form-control" 
              id="rankFusionDropdown" 
              value={rankFusionMethod} 
              onChange={(e) => setRankFusionMethod(e.target.value)}
            >
              <option value="">Select a rank fusion method</option>
              {Object.keys(rankFusionMap).map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group mb-4">
            <label htmlFor="fileUpload mt-4">Upload Bug History Report (XML report): </label>
            <input 
              type="file" 
              className="form-control-file" 
              id="fileUpload" 
              onChange={(e) => setFile(e.target.files[0])} 
            />
          </div>

          <button type="button" onClick={handleGitHubLogin} className="btn btn-secondary mt-3 mb-3 me-3">
            Connect GitHub
          </button>
          {githubStatus && <div className="mt-2 alert alert-info">{githubStatus}</div>}

          <button type="submit" className="btn btn-primary mt-3 mb-3 me-3" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </form>

        {message && <div className="mt-3 alert alert-info">{message}</div>}
      </div>
    </>
  );
}

export default App;
