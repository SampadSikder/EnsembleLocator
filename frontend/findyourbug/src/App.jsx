import { useState, useEffect } from 'react';
import axios from 'axios';  // Import Axios for API requests
import 'bootstrap/dist/css/bootstrap.min.css'; // Import Bootstrap styles
import './App.css';
import { Github, Upload } from "lucide-react"
import logo from './logo.jpg';
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
    'LLM': 2,
    'Both': 3,
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    console.log(file);


    if (!githubRepo || !alphaValue || !technique || !rankFusionMethod) {
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
    console.log(rankFusionMap[rankFusionMethod])

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
    <div className="min-h-screen flex flex-col items-center px-4 py-12 bg-white">
      <h1 className="text-2xl font-semibold mb-12">FindYourBug</h1>

    <div className="text-center">
        <img 
    src={logo} 
    alt="FindYourBug Logo" 
    className="img-fluid mb-4 rounded-circle" 
    style={{ maxWidth: '150px', maxHeight: '150px', border: '2px solid #ddd' }} 
  />
</div>

<div className="w-[400px] h-[600px] bg-gray-50 shadow-md rounded-lg p-6">
        <div className="text-center mb-12">
          <p className="text-gray-600">Set up your bug finding parameters</p>
       
    </div>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <label className="block text-sm font-bold mt-3 mb-2 text-left">GitHub Repository URL</label>
          <input
            type="text"
            value={githubRepo}
            onChange={(e) => setGithubRepo(e.target.value)}
            placeholder="https://github.com/username/repo"
            className="mb-6 w-full p-2 border rounded focus:outline-none focus:border-gray-400"
          />
        </div>

        <div>
          <label className="block text-sm font-bold mt-3 mb-2 text-left">Alpha Value</label>
          <input
            type="text"
            value={alphaValue}
            onChange={(e) => setAlphaValue(e.target.value)}
            placeholder="Enter alpha value (default is 0.2)"
            className="w-full p-2 border rounded focus:outline-none focus:border-gray-400"
          />
        </div>

        <div>
          <label className="block text-sm font-bold mt-3 mb-2 text-left">Technique</label>
          <select
            value={technique}
            onChange={(e) => setTechnique(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:border-gray-400"
          >
            <option value="">Select a technique</option>
            {Object.keys(techniqueMap).map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold mt-3 mb-2 text-left">Rank Fusion Method</label>
          <select
            value={rankFusionMethod}
            onChange={(e) => setRankFusionMethod(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:border-gray-400"
          >
            <option value="">Select a rank fusion method</option>
            {Object.keys(rankFusionMap).map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold mt-3 mb-2 text-left">Historical Bug Report (XML)</label>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => document.getElementById("fileUpload").click()}
              className="px-4 py-2 border rounded text-sm hover:bg-gray-50"
            >
              <Upload className="inline-block w-4 h-4 mr-2 mt-3" />
              Choose File
            </button>
            <span className="text-sm text-gray-500">{file ? file.name : "No file chosen"}</span>
            <input
              id="fileUpload"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleGitHubLogin}
          className="w-full p-2 mb-3 mt-3 border rounded text-sm hover:bg-gray-50 flex items-center justify-center"
        >
          <Github className="w-4 h-4 mr-2" />
          Connect GitHub
        </button>

        <button
          type="submit"
          disabled={loading}
          className="w-full p-2 bg-black text-white rounded text-sm hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Submit"}
        </button>
      </form>

      {message && (
        <div className="mt-8 p-4 border rounded">
          <h3 className="text-lg font-medium mb-2">Status</h3>
          <p className="text-sm">{message}</p>
        </div>
      )}
    </div>
    </div>
  );
}

export default App;
