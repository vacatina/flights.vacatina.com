import { Check, X } from "lucide-react";

const cons = [
  {
    title: "Confusing embassy instructions",
    description:
      "Government sites often have outdated links, unclear wording, and multiple versions of the same requirement.",
  },
  {
    title: "Risk of errors or rejection",
    description:
      "A small mistake on a form or missing document can result in delays or straight-up refusal.",
  },
  {
    title: "Limited submission times",
    description:
      "You need to match embassy schedules, appointment availability, and cut-off windows.",
  },
  {
    title: "No dedicated support",
    description:
      "If you get stuck, there's usually no one to call, message, or ask.",
  },
  {
    title: "No save-progress system",
    description:
      "If you lose a browser tab or connection, you often have to start the process again.",
  },
  {
    title: "Restricted payment methods",
    description: "Some portals accept only one or two types of payments.",
  },
];

const pros = [
  {
    title: "Simple, step-by-step application",
    description:
      "Crystal-clear forms built to remove confusion so you finish in minutes.",
  },
  {
    title: "Document check by visa specialists",
    description:
      "Your application is reviewed to reduce errors and avoid unnecessary delays.",
  },
  {
    title: "Apply whenever you want",
    description:
      "No embassy timings. No appointment headaches. Vacatina is open 24/7.",
  },
  {
    title: "Real human support",
    description:
      "Chat, phone, and email support whenever you need help — no more guessing.",
  },
  {
    title: "Save your progress",
    description:
      "Complete your application at your own pace without losing anything.",
  },
  {
    title: "Multiple payment options",
    description: "Pay the way you prefer — fast and secure every time.",
  },
];

export default function Comparison() {
  return (
    <div className="grid gap-6 md:mt-20 pb-14 md:grid-cols-4 md:gap-0  mx-auto max-w-6xl">
      <div className="rounded-md flex flex-col justify-between space-y-8  border-dashed border-1 p-6 md:col-span-2 md:my-2 md:rounded-r-none md:border-r-0 lg:p-10">
        <div className="space-y-6">
          <h3 className="!text-2xl font-bold !mb-6 text-muted-foreground">
            Do it yourself
          </h3>
          <hr className=" border-0.5 !mb-8 !border-dashed" />
          <div className="space-y-8">
            {cons.map((item, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center mt-1">
                  <X className="w-4 h-4 text-destructive" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">
                    {item.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className=" bg-white rounded-md border-1 border-dashed border-blue-400 p-6 shadow-lg shadow-gray-950/5 md:col-span-2 lg:p-10 ">
        <div className="grid gap-6 ">
          <div>
            <h3 className="!text-xl gap-3  items-center flex font-bold !mb-6 text-muted-foreground">
              <span>With</span>{" "}
              <img src="/img/general/logo-dark.svg" alt="logo icon " />
            </h3>
            <hr className=" border-0.5 !mb-8 !border-dashed " />
            <div className="space-y-8">
              {pros.map((item, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center mt-1">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-1">
                      {item.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
