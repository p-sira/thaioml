(function initSnomedWidget() {
  if (typeof window.CMS === 'undefined' || typeof window.createClass === 'undefined' || typeof window.h === 'undefined') {
    setTimeout(initSnomedWidget, 50);
    return;
  }

var SnomedControl = createClass({
  getInitialState: function () {
    return {
      loading: false,
      error: null,
      suggestion: null,
    };
  },

  componentDidMount: function () {
    this.fetchSuggestion();
    this.hideFields();
  },

  componentDidUpdate: function (prevProps) {
    // Removed auto-fetch to avoid spamming the backend while typing.
  },

  componentWillUnmount: function () {
  },

  updateSiblingField: function (labelText, value) {
    var labels = document.querySelectorAll('label');
    for (var i = 0; i < labels.length; i++) {
      var text = labels[i].textContent.trim();
      if (text === labelText || text.startsWith(labelText + ' ')) {
        var inputId = labels[i].getAttribute('for');
        if (inputId) {
          var input = document.getElementById(inputId);
          if (input) {
            var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            if (nativeInputValueSetter) {
              nativeInputValueSetter.call(input, value);
              input.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }
        }
      }
    }
  },

  hideFields: function () {
    var checkCount = 0;
    var interval = setInterval(function () {
      checkCount++;
      if (checkCount > 50) { clearInterval(interval); return; }

      var labels = document.querySelectorAll('label');
      var hiddenCount = 0;
      for (var i = 0; i < labels.length; i++) {
        var text = labels[i].textContent.trim();
        if (text === 'ID' || text.startsWith('ID ') || text === 'SNOMED FSN' || text.startsWith('SNOMED FSN ')) {
          var inputId = labels[i].getAttribute('for');
          var input = inputId ? document.getElementById(inputId) : null;
          if (input) {
            input.readOnly = true; // Fallback
            var p = labels[i].parentNode;
            while (p && p.tagName !== 'BODY') {
              if (p.contains(input)) {
                if (p.style.display !== 'none') {
                  p.style.display = 'none';
                }
                break;
              }
              p = p.parentNode;
            }
            hiddenCount++;
          }
        }
      }
      if (hiddenCount >= 2) {
        clearInterval(interval);
      }
    }, 200); // Check every 200ms
  },


  fetchSuggestion: function () {
    var self = this;
    var title = this.props.entry.getIn(['data', 'title']);

    if (!title || typeof title !== 'string' || title.trim() === '') {
      var titleInput = document.querySelector('input[id*="title"]');
      if (titleInput) {
        title = titleInput.value;
      }
    }

    if (!title || title.trim() === '') {
      this.setState({ error: 'Please enter a title first' });
      return;
    }

    self.setState({ loading: true, error: null });

    var tokenPromise = (window.Clerk && window.Clerk.session) ? window.Clerk.session.getToken() : 
                       (window.parent && window.parent.Clerk && window.parent.Clerk.session) ? window.parent.Clerk.session.getToken() : 
                       Promise.resolve(null);
    
    tokenPromise.then(function(token) {
      var headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;
      
      return fetch('http://localhost:8080/snomed-suggest', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ query: title }),
      });
    })
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) {
            throw new Error(data.detail || 'Failed to fetch SNOMED concept');
          }
          return data;
        });
      })
      .then(function (data) {
        self.setState({ suggestion: data });

        var value = self.props.value;
        var currentValue = value && value.toJS ? value.toJS() : value;
        if (!currentValue) {
          self.props.onChange(data);
          self.updateSiblingField('ID', data.id);
          self.updateSiblingField('SNOMED FSN', data.term);
        }
      })
      .catch(function (err) {
        self.setState({ error: err.message });
      })
      .finally(function () {
        self.setState({ loading: false });
      });
  },

  handleManualAccept: function (e) {
    e.preventDefault();
    if (this.state.suggestion) {
      this.props.onChange(this.state.suggestion);
      this.updateSiblingField('ID', this.state.suggestion.id);
      this.updateSiblingField('SNOMED FSN', this.state.suggestion.term);
    }
  },

  handleClear: function (e) {
    e.preventDefault();
    this.props.onChange(null);
    this.updateSiblingField('ID', '');
    this.updateSiblingField('SNOMED FSN', '');
  },

  render: function () {
    var value = this.props.value;
    var entry = this.props.entry;
    var loading = this.state.loading;
    var error = this.state.error;
    var suggestion = this.state.suggestion;
    var title = entry.getIn(['data', 'title']);
    var currentValue = value && value.toJS ? value.toJS() : value;

    var children = [];

    // Current selection row
    var selectionChildren = [
      h('div', {},
        h('strong', { style: { color: '#333' } }, 'Current SNOMED Selection:'),
        h('br'),
        h('span', { style: { fontSize: '1.1em', color: currentValue ? '#000' : '#888' } },
          currentValue ? '[' + currentValue.id + '] ' + currentValue.term : 'None selected'
        )
      ),
    ];

    if (currentValue) {
      selectionChildren.push(
        h('button', {
          onClick: this.handleClear,
          style: { padding: '5px 10px', background: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a', borderRadius: '3px', cursor: 'pointer' },
        }, 'Clear')
      );
    }

    children.push(
      h('div', { style: { marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        selectionChildren
      )
    );

    // Auto-suggest hint
    children.push(
      h('div', { style: { fontSize: '0.85em', color: '#666', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        h('span', {},
          h('em', {}, 'Click to suggest from title: "' + (title || '...') + '"')
        ),
        h('button', {
          type: 'button',
          onClick: function (e) { e.preventDefault(); this.fetchSuggestion(); }.bind(this),
          style: { padding: '4px 10px', background: '#e0e0e0', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em' }
        }, 'Suggest')
      )
    );

    // Loading indicator
    if (loading) {
      children.push(
        h('div', { style: { color: '#1565c0', fontWeight: 'bold' } }, '⏳ AI is translating and verifying SNOMED concept...')
      );
    }

    // Error message
    if (error) {
      children.push(
        h('div', { style: { color: '#c62828', padding: '10px', backgroundColor: '#ffebee', borderRadius: '4px' } }, 'Error: ' + error)
      );
    }

    // Suggestion box
    if (suggestion && !loading) {
      var suggestionChildren = [
        h('div', { style: { color: '#2e7d32' } }, h('strong', {}, '✨ AI Verified Suggestion:')),
        h('div', { style: { fontSize: '1.1em', margin: '5px 0' } }, '[' + suggestion.id + '] ' + suggestion.term),
      ];

      if (!currentValue || currentValue.id !== suggestion.id) {
        suggestionChildren.push(
          h('button', {
            onClick: this.handleManualAccept,
            style: { marginTop: '8px', padding: '6px 12px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' },
          }, 'Accept Suggestion')
        );
      }

      children.push(
        h('div', { style: { marginTop: '10px', padding: '12px', backgroundColor: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '4px' } },
          suggestionChildren
        )
      );
    }

    return h('div', {
      style: { padding: '12px', border: '2px solid #dfdfe3', borderRadius: '5px', backgroundColor: '#fdfdfd', fontFamily: 'system-ui, sans-serif' },
    }, children);
  },
});

var SnomedPreview = createClass({
  render: function () {
    var value = this.props.value;
    if (!value) return null;

    var data = value.toJS ? value.toJS() : value;

    return h('div', {
      style: { padding: '10px', backgroundColor: '#f0f0f0', borderLeft: '4px solid #4caf50', margin: '10px 0' },
    },
      h('strong', {}, 'SNOMED CT:'),
      ' ' + data.term + ' (ID: ' + data.id + ')'
    );
  },
});

CMS.registerWidget('snomed', SnomedControl, SnomedPreview);


var SnomedLinkerControl = createClass({
  getInitialState: function () {
    return {
      loading: false,
      error: null,
      originalValues: {},
      localValue: {},
    };
  },

  componentDidMount: function () {
    var value = this.props.value;
    var currentValue = value && value.toJS ? value.toJS() : value || {};
    var originals = {};
    for (var k in currentValue) {
      if (currentValue.hasOwnProperty(k)) {
        originals[k] = currentValue[k].split('|')[0].trim();
      }
    }
    this.setState({ originalValues: originals, localValue: currentValue });
  },

  componentDidUpdate: function (prevProps) {
    var prev = prevProps.value && prevProps.value.toJS ? prevProps.value.toJS() : prevProps.value || {};
    var curr = this.props.value && this.props.value.toJS ? this.props.value.toJS() : this.props.value || {};
    
    // Sync local state if external props changed (e.g. Undo action)
    if (JSON.stringify(prev) !== JSON.stringify(curr)) {
       if (JSON.stringify(this.state.localValue) !== JSON.stringify(curr)) {
         this.setState({ localValue: curr });
       }
    }
  },

  handleAutoLink: function (e) {
    e.preventDefault();
    var self = this;
    var body = this.props.entry.getIn(['data', 'body']);

    if (!body || typeof body !== 'string' || body.trim() === '') {
      var bodyInput = document.querySelector('div[data-slate-editor="true"]');
      if (bodyInput) {
        body = bodyInput.innerText || bodyInput.textContent;
      }
    }

    if (!body || body.trim() === '') {
      this.setState({ error: 'Please enter article body text first.' });
      return;
    }

    self.setState({ loading: true, error: null });

    var tokenPromise = (window.Clerk && window.Clerk.session) ? window.Clerk.session.getToken() : 
                       (window.parent && window.parent.Clerk && window.parent.Clerk.session) ? window.parent.Clerk.session.getToken() : 
                       Promise.resolve(null);
                       
    tokenPromise.then(function(token) {
      var headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;

      return fetch('http://localhost:8080/auto-link', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ body: body }),
      });
    })
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) {
            throw new Error(data.detail || 'Failed to auto-link terms');
          }
          return data;
        });
      })
      .then(function (data) {
        var originals = {};
        for (var k in data.links) {
          originals[k] = data.links[k].split('|')[0].trim();
        }
        self.setState({ 
          originalValues: Object.assign({}, self.state.originalValues, originals),
          localValue: data.links
        });
        self.props.onChange(data.links);
      })
      .catch(function (err) {
        self.setState({ error: err.message });
      })
      .finally(function () {
        self.setState({ loading: false });
      });
  },

  handleKeyChange: function (oldKey, e) {
    var newKey = e.target.value.trim();
    if (newKey !== oldKey && newKey !== '') {
      var currentValue = Object.assign({}, this.state.localValue);
      var val = currentValue[oldKey];
      delete currentValue[oldKey];
      currentValue[newKey] = val;

      var originals = Object.assign({}, this.state.originalValues);
      if (originals[oldKey]) {
        originals[newKey] = originals[oldKey];
        delete originals[oldKey];
      }

      this.setState({ localValue: currentValue, originalValues: originals });
      this.props.onChange(currentValue);
    }
  },

  handleIdChange: function (key, originalTerm, e) {
    var newId = e.target.value;
    var currentValue = Object.assign({}, this.state.localValue);

    if (originalTerm) {
      currentValue[key] = newId + " | " + originalTerm;
    } else {
      currentValue[key] = newId;
    }
    
    this.setState({ localValue: currentValue });
    this.props.onChange(currentValue);
  },

  handleDelete: function (key) {
    var currentValue = Object.assign({}, this.state.localValue);
    delete currentValue[key];
    this.setState({ localValue: currentValue });
    this.props.onChange(currentValue);
  },

  handleAdd: function (e) {
    e.preventDefault();
    var currentValue = Object.assign({}, this.state.localValue);
    var newKey = "NewTerm" + Math.floor(Math.random() * 1000);
    currentValue[newKey] = "";
    this.setState({ localValue: currentValue });
    this.props.onChange(currentValue);
  },

  handleClear: function (e) {
    e.preventDefault();
    this.setState({ localValue: {} });
    this.props.onChange(null);
  },

  render: function () {
    var loading = this.state.loading;
    var error = this.state.error;
    var currentValue = this.state.localValue || {};
    var self = this;

    var children = [];

    // Auto-Link Button
    children.push(
      h('div', { style: { marginBottom: '10px' } },
        h('button', {
          type: 'button',
          onClick: this.handleAutoLink,
          style: { padding: '8px 15px', background: '#2196f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }
        }, '🪄 Auto-Link Terms')
      )
    );

    if (loading) {
      children.push(
        h('div', { style: { color: '#1565c0', fontWeight: 'bold', marginBottom: '10px' } }, '⏳ AI is extracting terms and verifying with FHIR API (this may take 10-20 seconds)...')
      );
    }

    if (error) {
      children.push(
        h('div', { style: { color: '#c62828', padding: '10px', backgroundColor: '#ffebee', borderRadius: '4px', marginBottom: '10px' } }, 'Error: ' + error)
      );
    }

    // Display Current Links
    if (Object.keys(currentValue).length > 0) {
      var linksList = [];
      for (var key in currentValue) {
        if (currentValue.hasOwnProperty(key)) {
          (function (k) {
            var parts = currentValue[k].split('|');
            var currentId = parts[0].trim();
            var termPart = parts.length > 1 ? parts.slice(1).join('|').trim() : "";
            var originalId = self.state.originalValues[k];
            var isModified = originalId && originalId !== currentId;

            linksList.push(
              h('div', { key: k, style: { display: 'flex', marginBottom: '8px', alignItems: 'center', width: '100%' } },
                h('input', {
                  type: 'text',
                  defaultValue: k,
                  onBlur: function (e) { self.handleKeyChange(k, e); },
                  placeholder: 'Term',
                  style: { flex: '1', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }
                }),
                h('span', { style: { margin: '0 10px', color: '#888' } }, '→'),
                h('input', {
                  type: 'text',
                  value: currentId,
                  onChange: function (e) { self.handleIdChange(k, termPart, e); },
                  placeholder: 'SNOMED ID',
                  style: { width: '120px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontFamily: 'monospace', backgroundColor: isModified ? '#fff9c4' : 'white' }
                }),
                termPart ? h('span', { style: { margin: '0 10px', color: '#555', fontSize: '0.9em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }, title: termPart }, termPart) : null,
                isModified ? h('span', { title: 'ID modified (unverified link)', style: { marginLeft: '5px', fontSize: '1.2em' } }, '⛓️‍💥') : null,
                h('button', {
                  type: 'button',
                  onClick: function () { self.handleDelete(k); },
                  title: 'Delete',
                  style: { marginLeft: 'auto', padding: '8px 12px', background: '#ef5350', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }
                }, '✕')
              )
            );
          })(key);
        }
      }

      children.push(
        h('div', { style: { backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '6px', border: '1px solid #e0e0e0' } },
          h('h4', { style: { marginTop: 0, marginBottom: '15px', color: '#333' } }, 'Mapped Terms:'),
          h('div', {}, linksList),
          h('div', { style: { marginTop: '15px', borderTop: '1px solid #ddd', paddingTop: '15px' } },
            h('button', {
              type: 'button',
              onClick: this.handleAdd,
              style: { padding: '6px 12px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginRight: '10px' }
            }, '➕ Add Link'),
            h('button', {
              type: 'button',
              onClick: this.handleClear,
              style: { padding: '6px 12px', background: '#e0e0e0', color: '#d32f2f', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }
            }, 'Clear All')
          )
        )
      );
    } else if (!loading) {
      children.push(
        h('div', { style: { backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '6px', border: '1px dashed #ccc' } },
          h('div', { style: { color: '#777', fontStyle: 'italic', marginBottom: '10px' } }, 'No terms mapped yet.'),
          h('button', {
            type: 'button',
            onClick: this.handleAdd,
            style: { padding: '6px 12px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }
          }, '➕ Add Link')
        )
      );
    }

    return h('div', {
      style: { padding: '12px', border: '2px dashed #90caf9', borderRadius: '5px', backgroundColor: '#e3f2fd', fontFamily: 'system-ui, sans-serif' },
    }, children);
  },
});

var SnomedLinkerPreview = createClass({
  render: function () {
    var value = this.props.value;
    if (!value) return null;

    var data = value.toJS ? value.toJS() : value;
    var count = Object.keys(data).length;

    return h('div', {
      style: { padding: '10px', backgroundColor: '#e3f2fd', borderLeft: '4px solid #2196f3', margin: '10px 0' },
    },
      h('strong', {}, 'SNOMED Links: '), count + ' term(s) auto-linked.'
    );
  },
});

CMS.registerWidget('snomed_linker', SnomedLinkerControl, SnomedLinkerPreview);

})();
