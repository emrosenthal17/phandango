/*eslint indent:0*/
var React = require('react');
var ReactDOM = require('react-dom');
var ContextMenuPlugin = require('phylocanvas-plugin-context-menu').default; //eslint-disable-line dot-notation
var Actions = require('../actions/actions.js');
var RawDataStore = require('../stores/RawDataStore.js');
var PhyloCanvas = require('PhyloCanvas').default; //eslint-disable-line dot-notation
var ErrStruct = require('../structs/errStruct.js');
var TaxaLocations = require('../stores/Taxa_Locations.js');
var PhyloReact;
PhyloCanvas.plugin(ContextMenuPlugin);


PhyloReact = React.createClass({displayName: 'displayName',

	componentDidMount: function () { // Invoked once, immediately after the initial rendering
		// initialise phylocanvas and basic info about how we want the tree to look
		phylocanvas = PhyloCanvas.createTree(ReactDOM.findDOMNode(this)); //GLOBAL
		phylocanvas.setTreeType('rectangular');
		phylocanvas.nodeAlign = true;
		this.attachListenersToPhylocanvas();
		// phylocanvas.load(RawDataStore.getParsedData('tree'))
		RawDataStore.addChangeListener(this.loadTree);
	},

	loadTree: function () {
		var treeData = RawDataStore.getParsedData('tree');
		if (treeData) {
			phylocanvas.load(treeData);
		}
		// here we can check, if there is a gubbins (blocks) file or a ROARY one, are the names the same
		// if they are not we dispatch an error object
		// I think, by now, the Actions "phylocanvas_loaded" should have run.... right?
		checkTaxaNames();
	},

	shouldComponentUpdate: function () {return false;},

	attachListenersToPhylocanvas: function () {
		// once phylocanvas is live we want to have a bunch of listeners which, when subtrees e.t.c. are selected they will update the store Taxa_Locations
		// or when zoom happens then we should do the same!
		// we update the store by listening to an event, triggering an action, dispatching the action e.t.c. (FLUX)

		document.getElementById('phyloDiv').addEventListener('updated', function (e) {if (e.property == 'selected') Actions.phylocanvas_nodes_selected(e.nodeIds);}, false);

		document.getElementById('phyloDiv').addEventListener('subtree', function (e) {Actions.phylocanvas_subtree_drawn(e.node);}, false);

		document.getElementById('phyloDiv').addEventListener('loaded', function (e) {Actions.phylocanvas_loaded();}, false);

		// the following is not ideal
		// following commit 835228f222e2917d22b31ade17b6ccc79cd1721f
		// phylocanvas should trigger an event when it actually redraws something
		phylocanvas.on('mousewheel', function () {
			Actions.phylocanvas_changed();
		});
		phylocanvas.on('mousemove', function () {
			Actions.phylocanvas_changed();
		});
	},
	render: function () {
        return (
            <div id="phyloDiv" className="inContainer"></div>
        );
	}
});

function checkTaxaNames() {
	var treeTaxa;
	var blockTaxaNames;
	var taxaTreeOnly = [];
	var taxaBlocksOnly = [];
	var genomicDatasetType = RawDataStore.getGenomicDatasetType();
	if (! RawDataStore.getDataLoaded().genomic) {
		return;
	}
	blockTaxaNames = RawDataStore.getBlockTaxaNames();
	treeTaxa = TaxaLocations.getActiveTaxa();
	taxaTreeOnly = elementsSpecificToFirstArray(treeTaxa, blockTaxaNames);
	taxaBlocksOnly = elementsSpecificToFirstArray(blockTaxaNames, treeTaxa);
	if (taxaTreeOnly.length === 0 && taxaBlocksOnly.length === 0) {
		return;
	}
	// create error
	var errStr = [
		'Comparing the taxa in your tree and ', genomicDatasetType, ' data showed the following:',
		<p/>,
		<strong>Taxa in tree only: </strong>,
		taxaTreeOnly.length === 0 ? '(none)' : taxaTreeOnly.join(', '),
		<p/>,
		<strong>Taxa in blocks only: </strong>,
		taxaBlocksOnly.length === 0 ? '(none)' : taxaBlocksOnly.join(', '),
		<p/>, <em>note that this may not necessarily be an error</em>
	];
	errObj = new ErrStruct(true, 'WARNING: Taxa names don\'t match.', errStr);
	Actions.newErr([errObj]);
}

function elementsSpecificToFirstArray(arr1, arr2) {
	var el;
	var ret = [];
	for (el of arr1) {
		if (arr2.indexOf(el) === -1) {
			ret.push(el);
		}
	}
	return (ret);
}

module.exports = PhyloReact;
