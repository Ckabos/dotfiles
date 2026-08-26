import {Accessor} from "ags";

export default function(
    {
        cssClasses,
        marginTop,
        marginBottom,
        marginStart,
        marginEnd,
        thin = false,
        visible = true,
    }: {
        cssClasses?: string[],
        marginTop?: number,
        marginBottom?: number,
        marginStart?: number,
        marginEnd?: number,
        thin?: boolean
        visible?: Accessor<boolean> | boolean,
    }
) {
    return <box
        visible={visible}
        marginTop={marginTop}
        marginBottom={marginBottom}
        marginStart={marginStart}
        marginEnd={marginEnd}
        cssClasses={
            cssClasses != null ?
                cssClasses.concat([thin ? "dividerThin" : "divider"]) :
                [thin ? "dividerThin" : "divider"]
        }/>
}