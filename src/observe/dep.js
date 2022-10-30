let id = 0;
class Dep {
    constructor() {
        this.id = id++; // 属性的dep要收集watcher
        this.subs = []; // 存放当前属性对应的watcher
    }

    depend() {
        // 这里不希望放置重复的watcher  dep -> watcher
        // watcher记录dep
        Dep.target.addDep(this) // 让watcher记住dept
    }

    addSub(watcher) {
        this.subs.push(watcher)
    }

    notifi() {
        this.subs.forEach(watcher => watcher.update()); // 通知watcher要更新
    }
}
Dep.target = null;

export default Dep;