const starts = {};
const LIFECYE = ['beforeCreate', 'created'];
LIFECYE.forEach(hook => {
    starts[hook] = function (p, c) {
        if (c) {
            if (p) {
                return p.concat(c)
            } else {
                return [c]
            }
        } else {
            return p;
        }
    }
})
export function mergeOptions(parent, child) {
    const options = {};
    for (let key in parent) {
        mergeField(key)
    }

    for (let key in child) {
        if (!parent.hasOwnProperty(key)) {
            mergeField(key)
        }
    }

    function mergeField(key) {
        // 策略模式减少ifelse
        if (starts[key]) {
            options[key] = starts[key](parent[key], child[key])
        } else {
            options[key] = child[key] || parent[key]
        }
    }

    return options;
}