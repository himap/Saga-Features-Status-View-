Ext.define('Rally.example.SagaFeaturesView', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    items: [{
        xtype: 'component',
        html: 'Select a checkbox to filter the grid',
        style: {
            marginBottom: '5px',
            fontWeight: '600',
        }
    }, {
        xtype: 'container',
        itemId: 'c_TargetReleaseFilter'
    }, {
        xtype: 'container',
        itemId: 'ScheduleStateFilter'
    }],
    sagaFeatures: null,
    
    launch: function() {
            
            
        this._createFilterBox('c_TargetRelease');
        this._createFilterBox('ScheduleState');
        this.add({
                xtype: 'rallybutton',
                text: 'Submit',
                handler: function() {
                    this._getFilter();
                },
                scope: this
            });
    },
    
    _getAllChildren(ids) {
        Ext.create('Rally.data.lookback.SnapshotStore', {
            listeners: {
                load: function(store, data, success) {
                    var me = this;
                    _.forEach(data, function(child) {
                        var itemHierarchy = child.get('_ItemHierarchy');
                        _.forEach(me.sagaFeatures, function(parent) {
                            if (_.contains(itemHierarchy, parent.get('ObjectID'))) {
                                parent.children.push(child);
                                return false;
                            }
                        });
                    });
                    console.log('matched up children');
                    this._onDataLoaded();
                },
                scope: this
            },
            context: this.getContext().getDataContext(),
            autoLoad: true,                 
            compress: true,
            useHttpPost: true,
            hydrate: ['Iteration', 'Project', 'ScheduleState'],
            fetch: ['FormattedID', 'Name', '_ref', 'ObjectID', 'Parent', '_ItemHierarchy', 'Iteration', 'Project', 'ScheduleState', 'PlanEstimate'],
            filters: [{
                property: '__At',
                value: 'current'
            }, {
                property: '_TypeHierarchy',
                operator: '=',
                value: 'HierarchicalRequirement'
            }, {
                property: '_ItemHierarchy',
                operator: 'in',
                value: ids
            }, {
                property: 'Children',
                value: null
            }]
        });
    },

    _createFilterBox: function(property) {
        if (property === "c_TargetRelease") {
            this.down('#' + property + 'Filter').add({
                xtype: 'rallyfieldvaluecombobox',
                id: property + 'Combobox',
                model: 'UserStory',
                multiSelect: true,
                field: property,
                onReady: function() {
                    var items = this.getStore().getRange();
                    var item;
                    _.forEach(items, function(i) {
                        if (i.get('name') === '16.2') {
                            item =i;
                            return false;
                        }
                    });
                    this.select(item);
                }
            });
        }
        else {
            this.down('#' + property + 'Filter').add({
                xtype: 'checkbox',
                cls: 'filter',
                boxLabel: 'Filter grid by ' + property,
                id: property + 'Checkbox'
            });
            this.down('#' + property + 'Filter').add({
                xtype: 'rallyfieldvaluecombobox',
                id: property + 'Combobox',
                model: 'UserStory',
                multiSelect: true,
                field: property
            });
        }
    },



    _getFilter: function() {
        // var filterString = Ext.getCmp('c_TargetReleaseCombobox').getValue() + '';
        // var filter = [];
        // if (filterString.length > 0) {
        //     console.log(filterString.split(','));
        //     filter.push({
        //         property: 'c_TargetRelease',
        //         operator: 'in',
        //         value: filterString.split(',')
        //     });
        // }
        // filter = this._checkFilterStatus('ScheduleState', filter);
        var filter = Ext.create('Rally.data.wsapi.Filter',{property: 'c_StoryType', operator: '=', value: 'SAGA Feature'});
		filter=this._checkFilterStatus('c_TargetRelease',filter);					
		filter=this._checkFilterStatus('ScheduleState',filter);
        if (this._myStore === undefined) {
            this._makeStore(filter);
        }
        else {
            this._myStore.clearFilter(true);
            this._myStore.filter(filter);

        }
    },
    
    _checkFilterStatus: function(property, filter) {
        if (property === 'c_TargetRelease' || Ext.getCmp(property + 'Checkbox').getValue()) {
			var filterString=Ext.getCmp(property + 'Combobox').getValue() +'';
			var filterArr=filterString.split(',');
			var propertyFilter=Ext.create('Rally.data.wsapi.Filter',{property: property, operator: '=', value: filterArr[0]});
			var i=1;
			while (i < filterArr.length){
				propertyFilter=propertyFilter.or({
					property: property,
				operator: '=',
				value: filterArr[i]
			});
			i++;
		}
		filter=filter.and(propertyFilter);
		}
		return filter;
        
        // if (Ext.getCmp(property + 'Checkbox').getValue()) {
        //     var filterString = Ext.getCmp(property + 'Combobox').getValue() + '';
        //     filter.push({
        //         property: property,
        //         operator: 'in',
        //         value: filterString.split(',')
        //     });
        // }
        // return filter;
    },

    _makeStore: function(filter) {
        // var filters = [{
        //     property: '__At',
        //     value: 'current'
        // }, {
        //     property: '_TypeHierarchy',
        //     operator: '=',
        //     value: 'HierarchicalRequirement'
        // }, {
        //     property: 'c_StoryType',
        //     value: 'SAGA Feature'
        // }];
        // filters = _.union(filters, filter);
        // Ext.create('Rally.data.lookback.SnapshotStore', {
        //     listeners: {
        //         scope: this,
        //         load: function(store, data, success) {
        //             this.sagaFeatures = data;
        //             var ids = _.map(data, function(item) {
        //                 item.children = [];
        //                 return item.get('ObjectID');
        //             });
        //             this._getAllChildren(ids);
        //         }
        //     },
        //     useHttpPost: true,
        //     context: this.getContext().getDataContext(),
        //     autoLoad: true,
        //     hydrate: ['ScheduleState'],
        //     fetch: ['FormattedID', 'Name', '_ref', 'ObjectID', 'Owner', 'Status', 'Blocked', 'Project',  
        //             'PlanEstimate', 'ScheduleState', 'c_TargetRelease', 'Tasks', 'c_PriorityBin'],
        //     filters: filters
        // });
        this._myStore = Ext.create('Rally.data.wsapi.Store', {
            model: 'userstory',
            autoLoad: true,
            showPagingToolbar: true,
            //		limit: Infinity,
            filters: filter,
            listeners: {
                load: function(store, data, success) {
                    this.sagaFeatures = data;
                    var ids = _.map(data, function(item) {
                        item.children = [];
                        return item.get('ObjectID');
                    });
                    this._getAllChildren(ids);
                },
                scope: this
            },
            fetch: ['FormattedID', 'Name', '_ref', 'ObjectID', 'Owner', 'Status', 'Blocked', 'Project', 'Children', 
            'PlanEstimate', 'ScheduleState', 'c_TargetRelease', 'Tasks', 'c_StoryType', 'c_PriorityBin', 'TestCases', 
            'TestCaseStatus', 'Description', 'Iteration', 'LastVerdict']
        });
    },

    _onDataLoaded: function() {
        var data = this.sagaFeatures;
        console.log("on data loaded...");
        var stories = [];
        console.log(this.sagaFeatures);
        Ext.Array.each(data, function(story) {
            var s = {
                FormattedID: story.get('FormattedID'),
                Name: story.get('Name'),
                _ref: story.get("_ref"),
                Owner: (story.get('Owner') && story.get('Owner')._refObjectName) || 'No Owner',
                Project: story.get('Project').Name,
                PlanEstimate: story.get('PlanEstimate'),
                ScheduleState: story.get("ScheduleState"),
                Blocked: story.get('Blocked'),
                TargetRelease: story.get("c_TargetRelease"),
                PriorityBin: story.get('c_PriorityBin'),
                ChildrenCount: story.get("DirectChildrenCount"),
                TestCaseCount: 'EEK',
                TestCaseStatus: 'EEK',
                Children: [],
                TestCases: [],
                Points: [],
                CApts: [],
                Percentage: 0
            };
            _.forEach(story.children, function(child) {
                var iteration = child.get('Iteration');
                s.Children.push({
                    _ref: child.get('_ref'),
                    FormattedID: child.get('FormattedID'),
                    Iteration: (iteration && iteration.Name) || 'Unscheduled'
                });
                if (child.get('ScheduleState') == 'Completed' || child.get('ScheduleState') == 'Accepted') {
                    s.Points.push(child.get('PlanEstimate'));
                }
            })
            var total = 0;
            for (var i = 0; i < s.Points.length; i++) {
                total += s.Points[i];
            }
            s.CApts.push(total.toFixed(2));
            var planest = s.PlanEstimate;
            var percent = (total / planest) * 100 || 0;
            s.Percentage = percent.toFixed(2) + "%";
            stories.push(s);
        });
                    //     var testcases = child.getCollection('TestCases', {
                    //         fetch: ['FormattedID', 'LastVerdict']
                    //     });
                    //     testcases.load({
                    //         callback: function(records, operation, success) {
                    //             _.each(records, function(testcase) {
                    //                 s.TestCases.push({
                    //                     _ref: testcase.get('_ref'),
                    //                     FormattedID: testcase.get('FormattedID'),
                    //                     Name: testcase.get('Name'),
                    //                     LastVerdict: testcase.get('LastVerdict')
                    //                 });
                    //             }, this);

                    //             --pendingTestCases;
                    //             if (pendingTestCases === 0) {
                    //                 this._createGrid(stories);
                    //             }
                    //         },
                    //         scope: this
                    //     });
                    // }, this);

                    // --pendingChildren
                    // if (pendingChildren === 0) {
                    //     
                    // }
        this._createGrid(stories);
    },

    _createGrid: function(stories) {
        var myCustomStore = Ext.create('Rally.data.custom.Store', {
            data: stories,
            pageSize: 50,
        });
        if (!this.grid) {
            this.grid = this.add({
                xtype: 'rallygrid',
                showPagingToolbar: true,
                showRowActionsColumn: false,
                editable: false,
                store: myCustomStore,
                enableBlockedReasonPopover: false,
                columnCfgs: [{
                        xtype: 'templatecolumn',
                        text: 'ID',
                        dataIndex: 'FormattedID',
                        width: 80,
                        tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate')
                            //	tpl: '<a target=\"_blank\" href=\"https://rally1.rallydev.com/#/3961096544d/detail{_ref}\">{FormattedID}</a>' ,
                    }, {
                        text: 'Name',
                        dataIndex: 'Name',
                        width: 100,
                        flex: 1
                    },
                    //{
                    //     text: 'State',
                    //     dataIndex: 'ScheduleState',
                    //     xtype: 'templatecolumn',
                    //     tpl: Ext.create('Rally.ui.renderer.template.ScheduleStateTemplate', {
                    //         states: ['Draft', 'Defined', 'In-Progress', 'Completed', 'Accepted'],
                    //         field: {
                    //             name: 'ScheduleState'
                    //         }
                    //     })
                    // },
                    {
                        text: 'State',
                        dataIndex: 'ScheduleState'
                    },
                    {
                        text: 'Priority',
                        dataIndex: 'PriorityBin'
                    }, {
                        text: 'Owner',
                        dataIndex: 'Owner'
                    }, {
                        text: 'Project',
                        dataIndex: 'Project'
                    }, {
                        text: 'T.Release',
                        dataIndex: 'TargetRelease'
                    }, {
                        text: 'Completed Pts / Total Pts',
                        xtype: 'templatecolumn',
                        tpl: '{CApts} / {PlanEstimate}'
                    }, {
                        text: '% Complete',
                        dataIndex: 'Percentage'
                    },
                    {
                        text: '% Complete', xtype: 'templatecolumn',
							 tpl: Ext.create('Rally.ui.renderer.template.progressbar.ProgressBarTemplate', {
							 percentDoneName: 'Percentage',
							 calculateColorFn: function(recordData) {
                                return "#F2C232";
                            }
						}),
					},
                    {
                        text: 'Children & Iteration Scheduled',
                        dataIndex: 'Children',
                        minWidth: 300,
                        renderer: function(value) {
                            var html = [];
                            Ext.Array.each(value, function(child) {
                                html.push('<a href="' + Rally.nav.Manager.getDetailUrl(child) + '">' + child.FormattedID + '</a>' + ' - ' + child.Iteration);
                            });
                            return html.join('</br>');
                        }
                    }, {
                        text: 'TestCases-Verdict',
                        dataIndex: 'TestCases',
                        minWidth: 200,
                        renderer: function(value) {
                            var html = [];
                            Ext.Array.each(value, function(testcase) {
                                html.push('<a href="' + Rally.nav.Manager.getDetailUrl(testcase) + '">' + testcase.FormattedID + '</a>' + '-' + testcase.LastVerdict);
                            });
                            return html.join('</br>');
                        }
                    }
                ]
            });
        }
        else {
            this.grid.reconfigure(myCustomStore);
        }
    }
});
