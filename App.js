Ext.define('Rally.example.SagaFeaturesView', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    layout: {
        type: 'vbox',
        align: 'stretch'
    },
    margin: '5 5 5 5',
    items: [{
            xtype: 'container',
            layout: {
                type: 'hbox',
                align: 'stretch'
            },
            height: 210,
            items: [{
                xtype: 'container',
                id: 'formCnt',
                layout: {
                    type: 'vbox'
                },
                items: [{
                    xtype: 'text',
                    text: 'Filter grid by Target Release',
                    margin: '0 0 5 0',
                    width: 200
                }]
            }, {
                xtype: 'container',
                id: 'chartCnt',
                layout: {
                    type: 'vbox',
                    align: 'stretch'
                },
                flex: 1,
                margin: '0 100 0 100'
            }]
        }, {
            xtype: 'container',
            flex: 1,
            layout: {
                type: 'hbox',
                align: 'stretch'
            },
            id: 'gridCnt'
    }],
    sagaFeatures: null,
    
    launch: function() {
        this._createFilterBox('c_TargetRelease');
        this._createFilterBox('ScheduleState');
        this.down('#formCnt').add({
            xtype: 'rallybutton',
            text: 'Submit',
            handler: function() {
                this._getFilter();
            },
            scope: this
        });
        this._createGrid(null);
    },
    
    _getAllChildren(ids) {
        Ext.create('Rally.data.lookback.SnapshotStore', {
            listeners: {
                load: function(store, data, success) {
                    var me = this;
                    _.forEach(data, function(child) {
                        var itemHierarchy = child.get('_ItemHierarchy');
                        
                        _.forEach(me.sagaFeatures, function(parent) {
                            
                            if (parent.get('ObjectID') !== child.get('ObjectID') &&
                                _.contains(itemHierarchy, parent.get('ObjectID'))) {
                                parent.children.push(child);
                                return false;
                            }
                        });
                    });
                    //this._getAllTestCases();
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
    
    _getAllTestCases: function() {
        this._loadedTestCases = 0;
        _.forEach(this.sagaFeatures, this._getTestCasesForSaga, this);
    },
    
    _getTestCasesForSaga: function(sagaFeature) {
        var filter =  Ext.create('Rally.data.wsapi.Filter', {
             property: 'WorkProduct.ObjectID',
             operator: '=',
             value: sagaFeature.get('ObjectID')
        });
        Ext.create('Rally.data.wsapi.Store', {
            model: 'testcase',
            autoLoad: true,
            filters: filter,
            listeners: {
                load: function(store, data, success) {
                    this._loadedTestCases++;
                    sagaFeature.testCases = data;
                    if (this._loadedTestCases >= this.sagaFeatures.length) {
                        this._onDataLoaded();
                    }
                },
                scope: this
            },
            fetch: ['FormattedID', 'LastVerdict']
        });
    },

    _createFilterBox: function(property) {
        if (property === "c_TargetRelease") {
            this.down('#formCnt').add({
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
            this.down('#formCnt').add([{
                    xtype: 'text',
                    text: 'Filter grid by Schedule State',
                    margin: '0 0 5 0',
                    width: 200
                },{
                xtype: 'rallyfieldvaluecombobox',
                id: property + 'Combobox',
                model: 'UserStory',
                multiSelect: true,
                field: property,
                onReady: function() {
                    var items = this.getStore().getRange();
                    var item;
                    _.forEach(items, function(i) {
                        if (i.get('name') === 'Completed') {
                            item =i;
                            return false;
                        }
                    });
                    this.select(item);
                }
            }]);
        }
    },

    _getFilter: function() {
        if (this.down('#rollupChart')) {
          this.down('#rollupChart').destroy();  
        };
        this.grid.reconfigure(null);
        this.grid.setLoading(true);
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
		return filter;
    },

    _makeStore: function(filter) {
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
            'PlanEstimate', 'ScheduleState', 'c_TargetRelease', 'Tasks', 'TaskEstimateTotal', 'TaskRemainingTotal', 'c_StoryType', 'c_PriorityBin', 'TestCases', 
            'TestCaseStatus', 'Description', 'Iteration', 'LastVerdict', 'Ready']
        });
    },
    
    _onDataLoaded: function() {
        var data = this.sagaFeatures;
        console.log("on data loaded...");
        var stories = [];
        this._totals = {
            totalStories: data.length,
            totalStoriesAccepted: 0,
            totalPointsAccepted: 0,
            totalStoriesEstimated: 0,
            totalPointsEstimated: 0,
            totalStoriesScheduled: 0,
            totalPlannedHours: 0,
            totalHoursRemaining: 0
        };
        Ext.Array.each(data, function(story) {
            var s = {
                FormattedID: story.get('FormattedID'),
                Name: story.get('Name'),
                _ref: story.get("_ref"),
                Ready: story.get('Ready'),
                Owner: (story.get('Owner') && story.get('Owner')._refObjectName) || 'No Owner',
                Project: story.get('Project').Name,
                PlanEstimate: story.get('PlanEstimate'),
                ScheduleState: story.get("ScheduleState"),
                Blocked: story.get('Blocked'),
                TargetRelease: story.get("c_TargetRelease"),
                PriorityBin: story.get('c_PriorityBin'),
                ChildrenCount: story.get("DirectChildrenCount"),
                TaskEstimateTotal: story.get('TaskEstimateTotal'),
                TaskRemainingTotal: story.get('TaskRemainingTotal'),
                TestCaseCount: 'EEK',
                TestCaseStatus: 'EEK',
                Children: [],
                TestCases: story.testCases,
                Points: [],
                CApts: [],
                Percentage: 0
            };
            
            if (s.ScheduleState === 'Accepted' || s.ScheduleState === 'Completed') {
                this._totals.totalStoriesAccepted++;
                this._totals.totalPointsAccepted += s.PlanEstimate;
            }
            if (Ext.isNumber(s.PlanEstimate)) this._totals.totalStoriesEstimated++;
            this._totals.totalPlannedHours += story.get('TaskEstimateTotal');
            this._totals.totalHoursRemaining += story.get('TaskRemainingTotal');
            this._totals.totalPointsEstimated += s.PlanEstimate;
            
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
        }, this);
        this._createGrid(stories);
    },

    _createGrid: function(stories) {
        var myCustomStore = Ext.create('Rally.data.custom.Store', {
            data: stories,
            pageSize: 50,
        });
        if (!this.grid) {
            this.grid = this.down('#gridCnt').add({
                xtype: 'rallygrid',
                id: 'dataGrid',
                showPagingToolbar: true,
                showRowActionsColumn: false,
                editable: false,
                flex: 1,
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
                    {
                        text: 'State',
                        dataIndex: 'ScheduleState',
                        xtype: 'templatecolumn',
                        tpl: Ext.create('Rally.ui.renderer.template.ScheduleStateTemplate', {
                            field: {
                                getAllowedStringValues: function() {
                                    return ['Draft', 'Defined', 'In-Progress', 'Completed', 'Accepted'];
                                },
                                name: 'ScheduleState'
                            }
                        })
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
                        text: 'Completed Pts / Total Pts (%)',
                        xtype: 'templatecolumn',
                        tpl: '{CApts} / {PlanEstimate} ({Percentage})'
                    },
                    {
                         text: 'Remaining Hrs / Total Hrs',
                        xtype: 'templatecolumn',
                        tpl: '{TaskRemainingTotal} / {TaskEstimateTotal}'
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
                            if (value) {
                                console.log(value);
                            }
                            Ext.Array.each(value, function(testcase) {
                                html.push('<a href="' + Rally.nav.Manager.getDetailUrl(testcase) + '">' + testcase.get('FormattedID') + '</a>' + '-' + testcase.get('LastVerdict'));
                            });
                            return html.join('</br>');
                        }
                    }
                ]
            });
        }
        else {
            this.grid.reconfigure(myCustomStore);
            this.down('#dataGrid').setLoading(false);
            
            this._createChart();
            
        }
        
    },
    
    _createChart: function() {
        
        var chart = this.down('#chartCnt').add({
           xtype: 'rallychart',
           id: 'rollupChart',
           loadMask: false,
             chartConfig: {
                chart: {
                    type: 'column',
                    inverted: true,
                    height: 200
                },
                title: {
                    text: 'SAGA Feature % Completion'
                },
                xAxis: {
                    
                },
                yAxis: {
                    min: 0,
                    labels: {
                        formatter: function() {
                            return this.value + '%';
                        }
                    },
                    title: {
                    text: null
                },
                }, 
                
                tooltip: {
                    pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b> ({point.percentage:.0f}%)<br/>',
                    shared: true
                },
                plotOptions: {
                    column: {
                        stacking: 'percent'
                    }
                },
                legend: {
                    reversed: true
                }
             },
             chartColors: ["#F6A900", "#8DC63F"],
             chartData: {
                categories: ['Task Hours', 'SAGA Features', 'Feature Points', '# Stories Estimated'],
                series: [ {
                    name: 'Remaining',
                    data: [this._totals.totalHoursRemaining, 
                            (this._totals.totalStories-this._totals.totalStoriesAccepted), 
                            (this._totals.totalPointsEstimated - this._totals.totalPointsAccepted), 
                            (this._totals.totalStories - this._totals.totalStoriesEstimated)]
                }, {
                    name: 'Completed',
                    data: [(this._totals.totalPlannedHours - this._totals.totalHoursRemaining), 
                            this._totals.totalStoriesAccepted, 
                            this._totals.totalPointsAccepted, 
                            this._totals.totalStoriesEstimated]
                }]
             }
        });
    }
});
