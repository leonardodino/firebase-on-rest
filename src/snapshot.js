function DataSnapshot(ref, data){
	this._ref = ref
	this._data = data
}

DataSnapshot.prototype.key = function(){
	return this._ref.key()
}

DataSnapshot.prototype.val = function(){
	return this._data
}

DataSnapshot.prototype.ref = function(){
	return this._ref
}

DataSnapshot.prototype.numChildren = function(){
	return this._data ? Object.keys(this._data).length : 0
}

module.exports = DataSnapshot
