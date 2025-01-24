import { useState } from 'react';
import axios from 'axios';  // Import Axios for API requests
import 'bootstrap/dist/css/bootstrap.min.css'; // Import Bootstrap styles
import './App.css';

function App() {
  const [githubRepo, setGithubRepo] = useState('');
  const [alphaValue, setAlphaValue] = useState('');
  const [technique, setTechnique] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const techniqueMap = {
    BugLocator: 1,
    Locus: 2,
    BLUiR: 3,
    AmaLgam: 4,
    All: 5,
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!githubRepo || !alphaValue || !technique || !file) {
      setMessage('Please fill all fields and upload a file.');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('gitRepoURL', githubRepo);
    formData.append('alphaValue', alphaValue);
    formData.append('techniqueNum', techniqueMap[technique] || null);
    formData.append('bugHistoryFile', file);

    try {
      const response = await axios.post('http://localhost:8080/api/config', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json'
        },
      });
      setMessage(response.data.message || 'Configuration saved successfully!');
    } catch (error) {
      console.error('Error submitting form:', error);
      setMessage(error.response?.data?.message || 'Error submitting the form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>    
      <div className="container mt-4">
        <h2>FindYourBug Configuration</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group mb-4">
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
            <label htmlFor="fileUpload mt-4">Upload Bug History Report (XML report): </label>
            <input 
              type="file" 
              className="form-control-file" 
              id="fileUpload" 
              onChange={(e) => setFile(e.target.files[0])} 
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </form>

        {message && <div className="mt-3 alert alert-info">{message}</div>}
      </div>
    </>
  );
}

export default App;
