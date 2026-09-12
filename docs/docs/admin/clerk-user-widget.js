var ClerkUserControl = createClass({
  getInitialState: function () {
    return {
      search: '',
      results: [],
      loading: false,
      error: null,
      showDropdown: false
    };
  },

  handleSearch: function (e) {
    var query = e.target.value;
    this.setState({ search: query, showDropdown: true });
    
    if (query.trim().length < 2) {
      this.setState({ results: [] });
      return;
    }

    this.setState({ loading: true, error: null });
    
    var isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    var baseUrl = isLocal ? 'http://localhost:3000' : 'https://app.thaioml.org';
    
    var self = this;
    fetch(baseUrl + '/api/users?query=' + encodeURIComponent(query))
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (Array.isArray(data)) {
          self.setState({ results: data });
        } else {
          // If the backend returns an error object
          self.setState({ error: data.error || 'Search failed', results: [] });
        }
      })
      .catch(function (err) {
        self.setState({ error: 'Network error' });
      })
      .finally(function () {
        self.setState({ loading: false });
      });
  },

  handleSelect: function (user) {
    this.props.onChange(window.Immutable.fromJS({
      id: user.id,
      username: user.username,
      name: user.name,
      avatar: user.imageUrl
    }));
    this.setState({ search: '', showDropdown: false });
  },
  
  handleClear: function () {
    this.props.onChange(null);
  },

  render: function () {
    var value = this.props.value;
    var currentValue = value && value.toJS ? value.toJS() : value;
    var self = this;

    if (currentValue && currentValue.username) {
      return h('div', { style: { padding: '10px', border: '1px solid #ccc', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9f9f9' } },
        h('div', { style: { display: 'flex', alignItems: 'center' } },
          currentValue.avatar ? h('img', { src: currentValue.avatar, style: { width: '32px', height: '32px', borderRadius: '50%', marginRight: '10px' } }) : null,
          h('div', {}, 
            h('strong', {}, currentValue.name),
            h('div', { style: { fontSize: '0.8em', color: '#666' } }, '@' + currentValue.username)
          )
        ),
        h('button', { type: 'button', onClick: this.handleClear, style: { padding: '5px 10px', color: '#c62828', cursor: 'pointer', border: '1px solid #ef9a9a', borderRadius: '4px', background: '#ffebee' } }, 'Remove')
      );
    }

    var dropdown = null;
    if (this.state.showDropdown && (this.state.results.length > 0 || this.state.loading || this.state.error)) {
      var items = [];
      if (this.state.loading) {
        items.push(h('div', { style: { padding: '10px', color: '#666' } }, 'Searching...'));
      } else if (this.state.error) {
        items.push(h('div', { style: { padding: '10px', color: '#c62828' } }, this.state.error));
      } else {
        items = this.state.results.map(function(u) {
          return h('div', { 
            key: u.id, 
            onClick: function() { self.handleSelect(u); },
            style: { padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', ':hover': { backgroundColor: '#f5f5f5' } }
          }, 
            u.imageUrl ? h('img', { src: u.imageUrl, style: { width: '24px', height: '24px', borderRadius: '50%', marginRight: '10px' } }) : null,
            h('span', {}, h('strong', {}, u.name), ' (@' + u.username + ')')
          );
        });
      }
      dropdown = h('div', { style: { position: 'absolute', zIndex: 100, background: 'white', border: '1px solid #ccc', width: '100%', maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderRadius: '4px', marginTop: '4px' } }, items);
    }

    return h('div', { style: { position: 'relative' } },
      h('input', {
        type: 'text',
        value: this.state.search,
        onChange: this.handleSearch,
        placeholder: 'Search user by name or username...',
        style: { width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }
      }),
      dropdown
    );
  }
});

var ClerkUserPreview = createClass({
  render: function () {
    var value = this.props.value;
    var data = value && value.toJS ? value.toJS() : value;
    if (!data || !data.username) return null;
    
    return h('span', { style: { padding: '2px 6px', backgroundColor: '#e3f2fd', border: '1px solid #90caf9', borderRadius: '4px', marginRight: '5px', fontSize: '0.9em' } }, 
      data.name + ' (@' + data.username + ')'
    );
  }
});

CMS.registerWidget('clerk_user', ClerkUserControl, ClerkUserPreview);
