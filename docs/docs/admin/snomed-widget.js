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
  },

  componentDidUpdate: function (prevProps) {
    // Removed auto-fetch to avoid spamming the backend while typing.
  },

  componentWillUnmount: function () {
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

    fetch('http://localhost:8080/snomed-suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: title }),
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
    }
  },

  handleClear: function (e) {
    e.preventDefault();
    this.props.onChange(null);
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
