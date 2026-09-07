const { useState, useEffect } = React;

const SnomedControl = (props) => {
  const { value, onChange, entry } = props;
  const title = entry.getIn(['data', 'title']);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  
  // Decap CMS provides value as an Immutable Map if it's an object. 
  // We need to convert it to a standard JS object for easier handling.
  const currentValue = value && value.toJS ? value.toJS() : value;

  useEffect(() => {
    if (!title || title.trim() === '') return;
    
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('http://localhost:8080/snomed-suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: title })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.detail || 'Failed to fetch SNOMED concept');
        }
        
        setSuggestion(data);
        
        // Auto-select if the field is currently empty
        if (!currentValue) {
            onChange(data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 2000); // 2-second debounce
    
    return () => clearTimeout(timer);
  }, [title]); // Only re-run when title changes

  const handleManualAccept = (e) => {
    e.preventDefault();
    if (suggestion) {
        onChange(suggestion);
    }
  };

  const handleClear = (e) => {
    e.preventDefault();
    onChange(null);
  }

  return (
    <div style={{ padding: '12px', border: '2px solid #dfdfe3', borderRadius: '5px', backgroundColor: '#fdfdfd', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ color: '#333' }}>Current SNOMED Selection:</strong><br/>
              <span style={{ fontSize: '1.1em', color: currentValue ? '#000' : '#888' }}>
                {currentValue ? `[${currentValue.id}] ${currentValue.term}` : 'None selected'}
              </span>
            </div>
            {currentValue && (
              <button onClick={handleClear} style={{ padding: '5px 10px', background: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a', borderRadius: '3px', cursor: 'pointer' }}>
                Clear
              </button>
            )}
        </div>
        
        <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '10px' }}>
            <em>Auto-suggesting based on title: "{title || '...'}"</em>
        </div>
        
        {loading && <div style={{ color: '#1565c0', fontWeight: 'bold' }}>⏳ AI is translating and verifying SNOMED concept...</div>}
        
        {error && <div style={{ color: '#c62828', padding: '10px', backgroundColor: '#ffebee', borderRadius: '4px' }}>Error: {error}</div>}
        
        {suggestion && !loading && (
            <div style={{ marginTop: '10px', padding: '12px', backgroundColor: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '4px' }}>
                <div style={{ color: '#2e7d32' }}><strong>✨ AI Verified Suggestion:</strong></div>
                <div style={{ fontSize: '1.1em', margin: '5px 0' }}>[{suggestion.id}] {suggestion.term}</div>
                {(!currentValue || currentValue.id !== suggestion.id) && (
                    <button onClick={handleManualAccept} style={{ marginTop: '8px', padding: '6px 12px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}>
                        Accept Suggestion
                    </button>
                )}
            </div>
        )}
    </div>
  );
};

const SnomedPreview = (props) => {
  const value = props.value;
  if (!value) return null;
  
  const data = value.toJS ? value.toJS() : value;
  
  return (
    <div style={{ padding: '10px', backgroundColor: '#f0f0f0', borderLeft: '4px solid #4caf50', margin: '10px 0' }}>
      <strong>SNOMED CT:</strong> {data.term} (ID: {data.id})
    </div>
  );
};

CMS.registerWidget('snomed', SnomedControl, SnomedPreview);
